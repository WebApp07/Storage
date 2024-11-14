"use server";

import { appwriteConfig } from "./../appwrite/config";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

import { cookies } from "next/headers";

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);

    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP.");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const exisitingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });

  if (!accountId) throw new Error("Failed to send an OTP.");

  if (!exisitingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADACAMAAAB/Pny7AAAAJFBMVEXQ0NDw8PDl5eXz8/PT09Pt7e3g4ODb29vq6urX19fNzc329vbTDxb8AAADPklEQVR4nO3c7ZaqIACFYUFEpfu/3wPTdMaULxWU7drv71b5LAzN0K5jjDHGGGOMMcYYY4wxxhhjjDHGGHtQap5HrfU4zuruTTmbGuUg+p+GSc93b86pRil68cl6gDlKLyhvzzTevVEHU3JFcZpB371Zh1LT1uKC1HjG5R3enmZ0yNIPcHP0HKA4jTR3b92+jAxjRA82NGqIYbCGxuiIxWqwMFMU84I6EYjuZXZkNNLQzHGMQPrSmDGBmZ6EGYi5p0ftZqnZTEDNZqnjzAiFiZ2aWQySpTORk2a0r4zVxL40LwWGiQ0N0sT8U2QKQPs54wrtaD3eNYDOqIBF3r1lR/JrMC1W49vTIK+a/WTkijPNaBPZIqPkYD29u+Y8DNPYAVs6t6+NWk42qWdwist8untDGGOMMcYYY4yV7km/9dSEe5lnnZI94oVRf27511M076Vsr0doPsvyHqBZLP2E13wtY0XXfC+XxNasl34iz2nbZaw91JqCZfrl+fsKdGx8FlSN3yIQl32HLYCaiAVOE7WAaYK3Fvw2AGlSFiRN2oKjybGgaOI3FmBpci0ImnxL+5o9ltY1+yyXa8w85a9r3Gu5WGPmoR9yX7zfcqnGuFtrcjVHLBdq7D7mPi9Pc8xymebX4j4w/eKjFvvmV9zT9mfJ0IyHLbb6mqUlqTllqa+xlq8TxqjmpMVqql6BWluimtMWIWrePWG2zwfop6Al65w/Xl9R43vWQUhTwlJT439ug19TxlJPE3oGhU9TylJL43s2yEezPussZxFVZoGwZauZS1oqHG9iFncTykJjCluKa+KWb01xS+HztJRlqSlvKatJW/40BY77VTU5lo+mjqWcJs/y1tSyuBuqrrQ4TT1LGU2+pXbnNe1YzmtaspzVtGU5p2nNckbTnuW4pkXLUY2KP0Pjto5oWrUc0bRr2a9p2WI1ux560bZln6Z1i9U8yJL1dwqMJXdsMCxCZGGaPO57epIlB5O3+KiFnmRJY4AsSUxiQWhbPcmSwGBZ4hgwSxSDZolh4CwRDJ4ljAG0BDFIx8r/PckSwGBa/BhQixdzfOHhzW0pSveobTGzhM0zMoEJjjHGGGOMMcZYtf4BqvYzbpfPFi4AAAAASUVORK5CYII=",
        accountId,
      }
    );
  }
  return parseStringify({ accountId });
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createSession(accountId, password);
    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP.");
  }
};
