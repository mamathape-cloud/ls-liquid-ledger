import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";

export async function sendNotification(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  await connectDB();
  await Notification.create(input);
  // Future: plug SMS/WhatsApp providers here
}

export async function sendNotifications(
  inputs: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }[]
) {
  if (!inputs.length) return;
  await connectDB();
  await Notification.insertMany(inputs);
}
