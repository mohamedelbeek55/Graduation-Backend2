import { Contact } from "./contact.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const contact = await Contact.create({
    name,
    email,
    subject,
    message
  });

  res.status(201).json({
    message: "Contact form submitted successfully",
    contact
  });
});

export const listContacts = asyncHandler(async (req, res) => {
  const contacts = await Contact.find().sort({ createdAt: -1 });
  res.json({ contacts });
});
