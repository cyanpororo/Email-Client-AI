CREATE TABLE IF NOT EXISTS email_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Inbox', -- 'Inbox', 'To Do', 'In Progress', 'Done', 'Snoozed'
  snoozed_until TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_workflows_user_status ON email_workflows(user_id, status);
