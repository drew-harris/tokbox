import { S3Client } from "bun";

export const client = new S3Client({
  accessKeyId: process.env["AWS_ACCESS_KEY_ID"],
  secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"],
  bucket: "tokbox-archive-drewh",
  region: "us-east-1",
});
