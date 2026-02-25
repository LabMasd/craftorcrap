-- craftorcrap Database Schema
-- Run this in your Supabase SQL Editor

-- Submissions table
create table submissions (
  id uuid default gen_random_uuid() primary key,
  url text not null unique,
  title text,
  thumbnail_url text,
  category text,
  submitted_by text,
  total_craft integer default 0,
  total_crap integer default 0,
  created_at timestamp default now()
);

-- Votes table
create table votes (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references submissions(id) on delete cascade,
  fingerprint text not null,
  ip_address text,
  verdict text check (verdict in ('craft', 'crap')),
  created_at timestamp default now(),
  unique(submission_id, fingerprint)
);

-- Enable Row Level Security
alter table submissions enable row level security;
alter table votes enable row level security;

-- Policies for submissions
create policy "Anyone can read submissions"
  on submissions for select
  using (true);

create policy "Anyone can insert submissions"
  on submissions for insert
  with check (true);

create policy "Service role can update submissions"
  on submissions for update
  using (true);

-- Policies for votes
create policy "Anyone can read votes"
  on votes for select
  using (true);

create policy "Anyone can insert votes"
  on votes for insert
  with check (true);

-- Enable realtime for submissions table
alter publication supabase_realtime add table submissions;

-- Indexes for better query performance
create index idx_submissions_category on submissions(category);
create index idx_submissions_created_at on submissions(created_at desc);
create index idx_submissions_total_craft on submissions(total_craft desc);
create index idx_submissions_total_crap on submissions(total_crap desc);
create index idx_votes_submission_id on votes(submission_id);
create index idx_votes_fingerprint on votes(fingerprint);
create index idx_votes_ip_address on votes(ip_address);
