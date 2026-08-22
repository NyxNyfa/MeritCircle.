export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.ENABLE_BACKEND_JOBS !== 'true') return

  const { startBackendJobs } = await import('@/lib/jobs')
  startBackendJobs()
}
