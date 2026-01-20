import logger from '../../../src/v1/helpers/logger'

type outputType = {
  totalRequests: number
  successfulResponses: number
  non2xxResponses: number
  avgLatency: number
}

/**
 * Parse autocannon output to extract load metrics
 */
export const parseAutocannonOutput = (output: string): outputType => {
  try {
    // Try to find the JSON part of the output (in case there's other text)
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in output')
    
    const results = JSON.parse(jsonMatch[0])
    return {
      totalRequests: results.requests.total,
      successfulResponses: results['2xx'],
      non2xxResponses: results.non2xx,
      avgLatency: results.latency.average
    }
  } catch (e) {
    logger.error('Failed to parse autocannon JSON output:', e)
    // Fallback to a safe object if parsing fails
    throw new Error(`Invalid output format - ${e}`)
  }
}
