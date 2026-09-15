# Deployment

## Supabase
1. Create Supabase project.
2. Configure environment variables locally.
3. Apply migrations.
4. Enable and test RLS.
5. Configure Auth redirect URLs for production.

## Vercel
1. Push repository to GitHub.
2. Import into Vercel.
3. Add environment variables.
4. Configure Supabase Auth redirect URLs for deployed domain.
5. Run production build and verify.

## Required checks
- Build succeeds
- Auth callback works
- No service role key exposed
- RLS blocks cross-user access
- Dynamic routes work after deployment

## Performance
Heavy face-tracking dependencies must be dynamically imported and not part of initial critical bundle.
