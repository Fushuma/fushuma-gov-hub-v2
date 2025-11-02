/**
 * Bridge Signature Utilities
 * Handles signature fetching from bridge validators
 * Ported from Bridge application
 */

export const SIGNATURE_URLS = [
  'https://mrs6x6ew7njwnad27dkhear7ya0tzbjy.lambda-url.eu-north-1.on.aws/',
  'https://7iurhujz7zfo4gx65p7ws7wliy0gaexu.lambda-url.eu-north-1.on.aws/',
  'https://3jb2sp2i7x27xmcol2qsetcvse0jgtzp.lambda-url.eu-north-1.on.aws/',
  'https://hvktatipoqgc74s6su4j3h273i0gaotl.lambda-url.us-east-1.on.aws/'
];

export const REQUIRED_SIGNATURES = 3;

/**
 * Fetch signature from a URL with retry logic
 */
async function fetchSignature(url: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      console.error(`Error fetching signature (attempt ${i + 1}):`, error);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  return null;
}

export interface SignatureResponse {
  isSuccess: boolean;
  signature?: string;
  message?: string;
  bridge?: string;
  originalToken?: string;
  originalChainID?: number;
  to?: string;
  value?: string;
  toContract?: string;
  data?: string;
}

/**
 * Get signatures for claim operation
 */
export async function getSignaturesForClaim(
  txHash: string,
  chainId: number
): Promise<{ signatures: string[]; response: SignatureResponse | null }> {
  const signatures: string[] = [];
  let lastResponse: SignatureResponse | null = null;

  for (let i = 0; i < SIGNATURE_URLS.length; i++) {
    const url = `${SIGNATURE_URLS[i]}auth?tx=${txHash}&chain=${chainId}`;
    const response = await fetchSignature(url);
    
    if (!response) continue;

    try {
      const json: SignatureResponse = await response.json();
      lastResponse = json;

      if (json.isSuccess && json.signature) {
        signatures.push(json.signature);
        
        if (signatures.length >= REQUIRED_SIGNATURES) {
          return { signatures, response: json };
        }
      }
    } catch (error) {
      console.error('Error parsing signature response:', error);
    }
  }

  return { signatures, response: lastResponse };
}

/**
 * Get signatures for adding wrapped token
 */
export async function getSignaturesForAddWrapped(
  tokenAddress: `0x${string}`,
  chainId: number
): Promise<{ signatures: string[]; response: SignatureResponse | null }> {
  const signatures: string[] = [];
  let lastResponse: SignatureResponse | null = null;

  for (let i = 0; i < SIGNATURE_URLS.length; i++) {
    const url = `${SIGNATURE_URLS[i]}addToken?token=${tokenAddress}&chain=${chainId}`;
    const response = await fetchSignature(url);
    
    if (!response) continue;

    try {
      const json: SignatureResponse = await response.json();
      lastResponse = json;

      if (json.isSuccess && json.signature) {
        signatures.push(json.signature);
        
        if (signatures.length >= REQUIRED_SIGNATURES) {
          return { signatures, response: json };
        }
      }
    } catch (error) {
      console.error('Error parsing signature response:', error);
    }
  }

  return { signatures, response: lastResponse };
}

/**
 * Check if claim is ready (has enough signatures)
 */
export async function isClaimReady(txHash: string, chainId: number): Promise<boolean> {
  const { signatures } = await getSignaturesForClaim(txHash, chainId);
  return signatures.length >= REQUIRED_SIGNATURES;
}

/**
 * Wait for claim to be ready with polling
 */
export async function waitForClaimReady(
  txHash: string,
  chainId: number,
  maxAttempts = 60,
  interval = 5000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const ready = await isClaimReady(txHash, chainId);
    if (ready) return true;
    
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  
  return false;
}
