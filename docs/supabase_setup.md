# Supabase Authentication & Database Setup Guide

This guide provides step-by-step instructions for connecting **Faceless Art Studio** to a live **Supabase** backend.

---

## 1. Overview: Code Implementation vs. External Configuration

Faceless Art Studio is architected with a strict zero-bypass security model:

| Implemented in Code (Ready Out-of-the-Box) | Requires Supabase / External Provider Configuration |
| :--- | :--- |
| Full client authentication state with persistent localStorage sessions | Supabase Project URL & Anon/Publishable API Key |
| Email OTP code request & 6-digit verification modal | Supabase Mailer or Custom SMTP in Dashboard |
| Phone SMS OTP interface with international country code selection | SMS Gateway (Twilio, MessageBird, etc.) in Supabase |
| Email + Password sign-up with client validation | Email verification policy in Supabase Auth settings |
| Password reset request & update password flow | Site URL & Redirect URLs in Supabase URL Configuration |
| Google OAuth client-side redirect integration | Google Cloud Console OAuth Client ID & Client Secret |
| GitHub OAuth client-side redirect integration | GitHub OAuth App Client ID & Client Secret |
| User profile syncing (`display_name`, `avatar_color`) with RLS | Database migration `001_create_profiles.sql` |
| Protected video generation (`POST /api/generate`) with zero bypass | Server environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) |
| Protected job status polling (`GET /api/jobs/{id}`) with user ownership | Server environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) |
| Protected uploads (`POST /api/upload`) | Server environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) |

---

## 2. Step-by-Step Setup Instructions

### Step 1: Create a Supabase Project
1. Navigate to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose your organization, assign a project name (e.g. `faceless-art-studio`), set a database password, and select your preferred region.
4. Click **Create new project** and wait for deployment to complete (~1-2 minutes).

### Step 2: Retrieve API Credentials
1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) > **API**.
2. Under **Project URL**, copy the `URL` (e.g. `https://your-project-ref.supabase.co`).
3. Under **Project API keys**, copy the `anon` / `public` key.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in your project root:
```env
# Frontend (Vite)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Backend (server.py)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 4: Run the Database Migration
1. In your Supabase Dashboard, go to the **SQL Editor** (terminal icon in left sidebar).
2. Click **New Query**.
3. Open `supabase/migrations/001_create_profiles.sql` from this repository.
4. Paste the entire SQL script into the editor:
   ```sql
   -- Creates profiles table, enables RLS, and sets up auth user auto-insert trigger
   CREATE TABLE IF NOT EXISTS public.profiles (
       id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
       display_name TEXT,
       avatar_color TEXT DEFAULT '#1E8CFA',
       created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
       updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
   );

   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view own profile"
       ON public.profiles FOR SELECT USING (auth.uid() = id);

   CREATE POLICY "Users can insert own profile"
       ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

   CREATE POLICY "Users can update own profile"
       ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
       INSERT INTO public.profiles (id, display_name, avatar_color)
       VALUES (
           NEW.id,
           COALESCE(
               NEW.raw_user_meta_data->>'display_name',
               NEW.raw_user_meta_data->>'full_name',
               split_part(NEW.email, '@', 1)
           ),
           COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#1E8CFA')
       )
       ON CONFLICT (id) DO NOTHING;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   CREATE TRIGGER on_auth_user_created
       AFTER INSERT ON auth.users
       FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```
5. Click **Run** to execute the migration.

### Step 5: Configure Site URL & Redirects
1. In your Supabase Dashboard, navigate to **Authentication** > **URL Configuration**.
2. Set **Site URL** to `http://localhost:5173` (or your production domain).
3. Under **Redirect URLs**, add:
   - `http://localhost:5173/**`
   - `http://127.0.0.1:5173/**`
4. Click **Save**.

### Step 6: Configure Email Authentication & Password Resets
1. In the Supabase Dashboard, go to **Authentication** > **Providers** > **Email**.
2. Ensure **Enable Email provider** is toggled ON.
3. (Optional for development) Disable **Confirm email** if you want new signups to immediately sign in without email verification.
4. For production deliverability, navigate to **Project Settings** > **Authentication** > **SMTP Settings** and configure your custom SMTP server (Resend, SendGrid, Amazon SES, or Postmark).

### Step 7: Configure Phone SMS Authentication (Optional)
1. Go to **Authentication** > **Providers** > **Phone**.
2. Toggle **Enable Phone Provider** ON.
3. Select an SMS gateway (e.g. **Twilio**, **MessageBird**, or **Vonage**).
4. Enter your Twilio Account SID, Auth Token, and Message Service SID / Sender Phone Number.
5. Click **Save**.

### Step 8: Configure Google OAuth (Optional)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project, then navigate to **APIs & Services** > **OAuth consent screen**.
3. Under **Credentials**, click **Create Credentials** > **OAuth client ID**.
4. Choose **Web application**.
5. Add Authorized JavaScript origins: `http://localhost:5173` and `https://<your-project-ref>.supabase.co`.
6. Add Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
7. Copy the generated **Client ID** and **Client Secret**.
8. In Supabase Dashboard, navigate to **Authentication** > **Providers** > **Google**.
9. Toggle Google ON, paste the Client ID and Client Secret, and click **Save**.

### Step 9: Configure GitHub OAuth (Optional)
1. In GitHub, go to **Settings** > **Developer settings** > **OAuth Apps** > **New OAuth App**.
2. Set **Application name**: `Faceless Art Studio`.
3. Set **Homepage URL**: `http://localhost:5173`.
4. Set **Authorization callback URL**: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
5. Click **Register application**, generate a new client secret, and copy the Client ID and Client Secret.
6. In Supabase Dashboard, go to **Authentication** > **Providers** > **GitHub**, paste the credentials, toggle ON, and click **Save**.

---

## 3. Backend Verification Policy

When `server.py` runs:
- If `SUPABASE_URL` and `SUPABASE_ANON_KEY` are unset:
  - Any request to `/api/generate` or `/api/upload` returns `HTTP 503 Service Unavailable`:
    ```json
    { "error": "Authentication backend is not configured on the server. SUPABASE_URL and SUPABASE_ANON_KEY must be set in the server environment before generation can proceed." }
    ```
- When configured:
  - Any request lacking `Authorization: Bearer <token>` or providing an invalid/expired token returns `HTTP 401 Unauthorized`.
  - When checking job status via `/api/jobs/{job_id}`, the server verifies that the authenticated user ID matches the job owner's ID (`403 Forbidden` if mismatched).
