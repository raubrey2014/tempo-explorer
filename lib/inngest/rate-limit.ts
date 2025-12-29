/**
 * Utility functions for handling rate limiting errors
 */

/**
 * Checks if an error is a rate limit error
 * Viem errors can have various shapes, so we check multiple properties
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false

  // Check if it's an Error object with a message
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const rateLimitIndicators = [
      'rate limit',
      '429',
      'too many requests',
      'request limit exceeded',
      'rate limit exceeded',
    ]
    
    if (rateLimitIndicators.some((indicator) => message.includes(indicator))) {
      return true
    }
  }

  // Check for HTTP status code 429
  // Viem errors may have status/statusCode in various places
  const errorObj = error as any
  if (errorObj?.status === 429 || errorObj?.statusCode === 429) {
    return true
  }

  // Check nested properties (viem errors sometimes wrap HTTP errors)
  if (errorObj?.cause?.status === 429 || errorObj?.cause?.statusCode === 429) {
    return true
  }

  if (errorObj?.error?.status === 429 || errorObj?.error?.statusCode === 429) {
    return true
  }

  // Check for Retry-After header in response
  if (errorObj?.response?.status === 429 || errorObj?.response?.statusCode === 429) {
    return true
  }

  return false
}

/**
 * Extracts the retry-after duration from an error, if available
 * Returns milliseconds, or null if not found
 */
export function getRetryAfterMs(error: unknown): number | null {
  if (!error) return null

  const errorObj = error as any

  // Check for Retry-After header (can be seconds or HTTP date)
  const retryAfter = 
    errorObj?.headers?.['retry-after'] ||
    errorObj?.response?.headers?.['retry-after'] ||
    errorObj?.cause?.headers?.['retry-after']

  if (retryAfter) {
    // If it's a number, it's seconds - convert to milliseconds
    const seconds = parseInt(retryAfter, 10)
    if (!isNaN(seconds)) {
      return seconds * 1000
    }

    // If it's a date string, parse it
    const date = new Date(retryAfter)
    if (!isNaN(date.getTime())) {
      return date.getTime() - Date.now()
    }
  }

  return null
}

/**
 * Calculates exponential backoff delay
 * @param attemptNumber - The current attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000ms = 1 second)
 * @param maxDelayMs - Maximum delay in milliseconds (default: 60000ms = 60 seconds)
 * @returns Delay in milliseconds
 */
export function calculateExponentialBackoff(
  attemptNumber: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 60000
): number {
  // Exponential backoff: baseDelay * 2^attemptNumber
  // Add some jitter to prevent thundering herd
  const exponentialDelay = baseDelayMs * Math.pow(2, attemptNumber)
  const jitter = Math.random() * 0.3 * exponentialDelay // Add up to 30% jitter
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs)
  
  return Math.floor(delay)
}

