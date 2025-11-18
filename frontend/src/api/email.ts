// Mock Email API - simulates email endpoints with realistic data

export type Mailbox = {
  id: string;
  name: string;
  unreadCount: number;
  icon?: string;
};

export type Email = {
  id: string;
  mailboxId: string;
  from: {
    name: string;
    email: string;
  };
  to: Array<{
    name: string;
    email: string;
  }>;
  cc?: Array<{
    name: string;
    email: string;
  }>;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
};

// Mock data storage
const mailboxes: Mailbox[] = [
  { id: "inbox", name: "Inbox", unreadCount: 5, icon: "📥" },
  { id: "starred", name: "Starred", unreadCount: 2, icon: "⭐" },
  { id: "sent", name: "Sent", unreadCount: 0, icon: "📤" },
  { id: "drafts", name: "Drafts", unreadCount: 1, icon: "📝" },
  { id: "archive", name: "Archive", unreadCount: 0, icon: "📦" },
  { id: "trash", name: "Trash", unreadCount: 0, icon: "🗑️" },
  { id: "work", name: "Work", unreadCount: 3, icon: "💼" },
  { id: "personal", name: "Personal", unreadCount: 2, icon: "👤" },
];

const mockEmails: Email[] = [
  {
    id: "1",
    mailboxId: "inbox",
    from: { name: "John Doe", email: "john.doe@example.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Welcome to our platform!",
    preview: "Thank you for joining us. We're excited to have you on board...",
    body: `<div>
      <p>Hi there,</p>
      <p>Thank you for joining us. We're excited to have you on board and can't wait to see what you'll accomplish with our platform.</p>
      <p>Here are some resources to get you started:</p>
      <ul>
        <li>Quick start guide</li>
        <li>Video tutorials</li>
        <li>Community forum</li>
      </ul>
      <p>Best regards,<br>The Team</p>
    </div>`,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: true,
    hasAttachments: true,
    attachments: [
      {
        id: "a1",
        name: "welcome-guide.pdf",
        size: 2048000,
        type: "application/pdf",
      },
    ],
  },
  {
    id: "2",
    mailboxId: "inbox",
    from: { name: "Sarah Wilson", email: "sarah@company.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    cc: [{ name: "Team", email: "team@company.com" }],
    subject: "Q4 Project Update",
    preview:
      "Here's the latest update on our Q4 projects. We've made significant progress...",
    body: `<div>
      <p>Hello team,</p>
      <p>Here's the latest update on our Q4 projects. We've made significant progress this week:</p>
      <ul>
        <li>Project Alpha: 75% complete</li>
        <li>Project Beta: 60% complete</li>
        <li>Project Gamma: 40% complete</li>
      </ul>
      <p>Please review and let me know if you have any questions.</p>
      <p>Thanks,<br>Sarah</p>
    </div>`,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: "3",
    mailboxId: "inbox",
    from: { name: "Newsletter", email: "newsletter@techblog.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "This Week in Technology",
    preview: "Your weekly digest of the most important tech news and trends...",
    body: `<div>
      <h2>This Week in Technology</h2>
      <p>Your weekly digest of the most important tech news and trends.</p>
      <h3>Top Stories:</h3>
      <ol>
        <li>AI breakthrough in natural language processing</li>
        <li>New web framework releases</li>
        <li>Cybersecurity updates you need to know</li>
      </ol>
      <p>Read more on our website.</p>
    </div>`,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: "4",
    mailboxId: "inbox",
    from: { name: "HR Department", email: "hr@company.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Annual Performance Review Schedule",
    preview:
      "Your annual performance review has been scheduled for next week...",
    body: `<div>
      <p>Dear Employee,</p>
      <p>Your annual performance review has been scheduled for next week.</p>
      <p><strong>Date:</strong> Friday, November 24, 2025<br>
      <strong>Time:</strong> 2:00 PM<br>
      <strong>Location:</strong> Conference Room B</p>
      <p>Please prepare your self-assessment form before the meeting.</p>
      <p>Best regards,<br>HR Department</p>
    </div>`,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: true,
    hasAttachments: true,
    attachments: [
      {
        id: "a2",
        name: "self-assessment-form.docx",
        size: 512000,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ],
  },
  {
    id: "5",
    mailboxId: "inbox",
    from: { name: "Michael Chen", email: "michael@startup.io" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Coffee chat next week?",
    preview: "Hey! I'd love to catch up and discuss potential collaboration...",
    body: `<div>
      <p>Hey!</p>
      <p>I'd love to catch up and discuss potential collaboration opportunities between our companies.</p>
      <p>Are you free for coffee next Tuesday or Wednesday afternoon?</p>
      <p>Looking forward to hearing from you!</p>
      <p>Cheers,<br>Michael</p>
    </div>`,
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: "6",
    mailboxId: "sent",
    from: { name: "Me", email: "me@example.com" },
    to: [{ name: "Client", email: "client@business.com" }],
    subject: "Re: Project Proposal",
    preview:
      "Thank you for your interest in our services. I've attached the proposal...",
    body: `<div>
      <p>Dear Client,</p>
      <p>Thank you for your interest in our services. I've attached the detailed project proposal as discussed.</p>
      <p>The proposal includes:</p>
      <ul>
        <li>Project timeline</li>
        <li>Deliverables</li>
        <li>Cost breakdown</li>
        <li>Terms and conditions</li>
      </ul>
      <p>Please review and let me know if you have any questions.</p>
      <p>Best regards</p>
    </div>`,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      {
        id: "a3",
        name: "project-proposal.pdf",
        size: 3145728,
        type: "application/pdf",
      },
    ],
  },
  {
    id: "7",
    mailboxId: "drafts",
    from: { name: "Me", email: "me@example.com" },
    to: [{ name: "Team Lead", email: "lead@company.com" }],
    subject: "Draft: Budget Request",
    preview: "I wanted to discuss the budget allocation for next quarter...",
    body: `<div>
      <p>Hi,</p>
      <p>I wanted to discuss the budget allocation for next quarter. Based on our current projects, we would need additional resources for:</p>
      <p>[Draft - not completed yet]</p>
    </div>`,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: "8",
    mailboxId: "work",
    from: { name: "Project Manager", email: "pm@company.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Sprint Planning Meeting",
    preview:
      "Our next sprint planning meeting is scheduled for Monday at 10 AM...",
    body: `<div>
      <p>Team,</p>
      <p>Our next sprint planning meeting is scheduled for Monday at 10 AM.</p>
      <p><strong>Agenda:</strong></p>
      <ol>
        <li>Review previous sprint</li>
        <li>Plan upcoming sprint</li>
        <li>Assign tasks</li>
        <li>Discuss blockers</li>
      </ol>
      <p>Please come prepared with your task estimates.</p>
    </div>`,
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: "9",
    mailboxId: "work",
    from: { name: "IT Support", email: "support@company.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "System Maintenance Notification",
    preview: "Scheduled system maintenance will occur this weekend...",
    body: `<div>
      <p>Dear Users,</p>
      <p>Scheduled system maintenance will occur this weekend from 11 PM Friday to 6 AM Monday.</p>
      <p>During this time, the following services will be unavailable:</p>
      <ul>
        <li>Email servers</li>
        <li>File storage</li>
        <li>Internal applications</li>
      </ul>
      <p>Please plan accordingly and save your work before the maintenance window.</p>
      <p>IT Support Team</p>
    </div>`,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: "10",
    mailboxId: "work",
    from: { name: "Security Team", email: "security@company.com" },
    to: [{ name: "All Staff", email: "all@company.com" }],
    subject: "Important: Security Update Required",
    preview: "Action required: Please update your password by end of week...",
    body: `<div>
      <p>Dear Team Members,</p>
      <p><strong>Action required:</strong> Please update your password by end of week.</p>
      <p>As part of our ongoing security improvements, all users must update their passwords to meet new security requirements:</p>
      <ul>
        <li>Minimum 12 characters</li>
        <li>At least one uppercase letter</li>
        <li>At least one number</li>
        <li>At least one special character</li>
      </ul>
      <p>Thank you for your cooperation.</p>
      <p>Security Team</p>
    </div>`,
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: true,
    hasAttachments: false,
  },
  {
    id: "11",
    mailboxId: "personal",
    from: { name: "Emily Johnson", email: "emily.j@email.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Dinner plans this Friday?",
    preview:
      "Hey! Want to grab dinner this Friday? There's a new restaurant...",
    body: `<div>
      <p>Hey!</p>
      <p>Want to grab dinner this Friday? There's a new Italian restaurant downtown that I've been wanting to try.</p>
      <p>Let me know if you're free around 7 PM!</p>
      <p>Emily</p>
    </div>`,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: "12",
    mailboxId: "personal",
    from: { name: "Book Club", email: "admin@bookclub.org" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: "Next Book Club Meeting - November 25",
    preview:
      'Our next book club meeting will discuss "The Midnight Library"...',
    body: `<div>
      <p>Hello Book Lovers!</p>
      <p>Our next book club meeting will discuss "The Midnight Library" by Matt Haig.</p>
      <p><strong>When:</strong> November 25, 2025 at 6:30 PM<br>
      <strong>Where:</strong> Community Center, Room 3<br>
      <strong>What to bring:</strong> Your thoughts and a snack to share!</p>
      <p>Looking forward to seeing everyone there!</p>
    </div>`,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  },
];

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// API functions
export async function getMailboxes(): Promise<Mailbox[]> {
  await delay(300);
  // Recalculate unreadCount for each mailbox based on mockEmails
  return mailboxes.map((mailbox) => {
    const unreadCount = mockEmails.filter(
      (email) => email.mailboxId === mailbox.id && !email.isRead
    ).length;
    return { ...mailbox, unreadCount };
  });
}

export async function getEmailsByMailbox(mailboxId: string): Promise<Email[]> {
  await delay(500);
  const filtered = mockEmails.filter((email) => email.mailboxId === mailboxId);

  return filtered;
}

export async function getEmailById(emailId: string): Promise<Email | null> {
  await delay(300);
  const email = mockEmails.find((e) => e.id === emailId);
  return email || null;
}

export async function markEmailAsRead(emailId: string): Promise<void> {
  await delay(200);
  const email = mockEmails.find((e) => e.id === emailId);
  if (email) {
    email.isRead = true;
  }
}

export async function markEmailAsUnread(emailId: string): Promise<void> {
  await delay(200);
  const email = mockEmails.find((e) => e.id === emailId);
  if (email) {
    email.isRead = false;
  }
}

export async function toggleEmailStar(emailId: string): Promise<void> {
  await delay(200);
  const email = mockEmails.find((e) => e.id === emailId);
  if (email) {
    email.isStarred = !email.isStarred;

    // Update starred mailbox
    if (email.isStarred && !email.mailboxId.includes("starred")) {
      // Add to starred (we just track with isStarred flag)
    }
  }
}
export async function archiveEmail(emailId: string): Promise<void> {
  await delay(200);
  const email = mockEmails.find((e) => e.id === emailId);
  if (email) {
    email.mailboxId = "archive";
  }
}

export async function archiveMultiple(emailIds: string[]): Promise<void> {
  await delay(300);
  emailIds.forEach((id) => {
    const email = mockEmails.find((e) => e.id === id);
    if (email) {
      email.mailboxId = "archive";
    }
  });
}

export async function deleteEmail(emailId: string): Promise<void> {
  await delay(200);
  const email = mockEmails.find((e) => e.id === emailId);
  if (email) {
    email.mailboxId = "trash";
  }
}

export async function markMultipleAsRead(emailIds: string[]): Promise<void> {
  await delay(300);
  emailIds.forEach((id) => {
    const email = mockEmails.find((e) => e.id === id);
    if (email) {
      email.isRead = true;
    }
  });
}

export async function deleteMultiple(emailIds: string[]): Promise<void> {
  await delay(300);
  emailIds.forEach((id) => {
    const email = mockEmails.find((e) => e.id === id);
    if (email) {
      email.mailboxId = "trash";
    }
  });
}

export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1) return bytes + " B";
  const mb = kb / 1024;
  if (mb < 1) return kb.toFixed(1) + " KB";
  return mb.toFixed(1) + " MB";
}
