import functions from "@google-cloud/functions-framework";
import formData from "form-data";
import Mailgun from "mailgun.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

functions.cloudEvent("webappFunction", async (cloudEvent) => {
  const base64name = cloudEvent.data.message.data;

  let userData = base64name ? Buffer.from(base64name, "base64").toString() : {};

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({ username: "api", key: process.env.API_KEY });

  userData = JSON.parse(userData);
  console.log(userData);

  mg.messages
    .create(process.env.DOMAIN, {
      from: "Webapp Support <mailgun@mail.ashishbadhe.me>",
      to: [userData.username],
      subject: "Verify User Email",
      text: `Hi ${userData.name}`,
      html: `<html><h1>Hello!</h1><p>Please click the link to verify : <a href=${userData.verificationLink}>Verification Link</a></p></html>`
    })
    .then(async (msg) => {
      console.log("Email Sent: ", msg);

      await updateDB(
        process.env.HOST,
        process.env.DATABASE_USER,
        process.env.DATABASE_PASSWORD,
        process.env.DATABASE_NAME,
        userData.username
      );
    })
    .catch((err) => console.log("Error Sending Email: ", err));
});

const updateDB = async (dbHost, dbUser, dbPassword, dbName, username) => {
  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
    });

    await connection.query(`UPDATE ${dbName}.Users SET verification_email = ? WHERE username = ?`, [true, username]);
    await connection.query(`UPDATE ${dbName}.Users SET emailSentTime = ? WHERE username = ?`, [new Date(), username]);
  } catch (err) {
    console.log("Error while updating DB", err.message);
  }
};
