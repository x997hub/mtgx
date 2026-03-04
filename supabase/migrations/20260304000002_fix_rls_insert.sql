-- Allow authenticated users to INSERT their own profile (needed for onboarding)
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
