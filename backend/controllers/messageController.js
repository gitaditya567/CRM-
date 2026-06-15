const Message = require("../models/Message");
const User = require("../models/User");

// Get messages between current user and specified user
exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ],
      deletedFor: { $ne: currentUserId }
    }).sort({ createdAt: 1 });

    // Mark these messages as read
    await Message.updateMany(
      { sender: otherUserId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );

    // Notify of read status via socket if needed
    const io = req.app.get("io");
    if (io) {
      io.to(otherUserId.toString()).emit("messagesRead", { readerId: currentUserId });
    }

    res.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const sender = req.user._id;
    const { recipient, text, fileUrl, fileName, fileType } = req.body;

    if (!recipient) {
      return res.status(400).json({ message: "Recipient is required" });
    }

    if ((!text || !text.trim()) && !fileUrl) {
      return res.status(400).json({ message: "Message text or file attachment is required" });
    }

    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    const message = await Message.create({
      sender,
      recipient,
      text: (text || "").trim(),
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      fileType: fileType || ""
    });

    const io = req.app.get("io");
    if (io) {
      const messagePayload = {
        ...message.toObject(),
        senderName: req.user.name
      };
      // Emit to recipient room and sender room
      io.to(recipient.toString()).emit("newMessage", messagePayload);
      io.to(sender.toString()).emit("newMessage", messagePayload);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// Get unread counts or list of recent conversations with last message and unread count
exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all other users
    const users = await User.find({ _id: { $ne: currentUserId } }).select("name role email");

    // Fetch last message for each user and unread count
    const conversationList = await Promise.all(
      users.map(async (u) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: currentUserId, recipient: u._id },
            { sender: u._id, recipient: currentUserId }
          ],
          deletedFor: { $ne: currentUserId }
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await Message.countDocuments({
          sender: u._id,
          recipient: currentUserId,
          read: false
        });

        return {
          user: u,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            createdAt: lastMessage.createdAt,
            sender: lastMessage.sender
          } : null,
          unreadCount
        };
      })
    );

    // Sort by last message date, users with messages first
    conversationList.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.json(conversationList);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Failed to load conversations" });
  }
};

// Delete a message (WhatsApp style: 'me' or 'everyone')
exports.deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { messageId } = req.params;
    const { type } = req.query; // 'me' or 'everyone'

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const isSender = message.sender.toString() === currentUserId.toString();
    const isRecipient = message.recipient.toString() === currentUserId.toString();

    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    if (type === "everyone") {
      if (!isSender) {
        return res.status(400).json({ message: "Only the sender can delete a message for everyone" });
      }
      // Delete completely from database
      await message.deleteOne();

      // Broadcast socket event so it disappears in real-time
      const io = req.app.get("io");
      if (io) {
        io.to(message.recipient.toString()).emit("messageDeleted", { messageId });
        io.to(message.sender.toString()).emit("messageDeleted", { messageId });
      }
    } else {
      // Delete for me: add to deletedFor array if not already present
      if (!message.deletedFor.includes(currentUserId)) {
        message.deletedFor.push(currentUserId);
        await message.save();
      }
    }

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Failed to delete message" });
  }
};
