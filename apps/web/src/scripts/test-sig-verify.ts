import { createPublicClient, http, keccak256, encodePacked, recoverMessageAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';

const RPC_URL = 'http://127.0.0.1:8545';
const MERIT_POOL = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';

const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const account = privateKeyToAccount(privateKey as `0x${string}`);
console.log('Account address:', account.address);

const targetUser = '0x59250f719772ee841a1a5ec6ac4b1e32ec3f1d7f';
const userTier = 5;

// Method 1: messageHash
const messageHash = keccak256(
  encodePacked(
    ['address', 'uint256'],
    [targetUser as `0x${string}`, BigInt(userTier)]
  )
);
console.log('Message hash:', messageHash);

(async () => {
  // Signing with raw bytes
  const signature = await account.signMessage({
    message: { raw: messageHash }
  });
  console.log('Signature:', signature);

  const recovered = await recoverMessageAddress({
    message: { raw: messageHash },
    signature,
  });
  console.log('Recovered locally with viem:', recovered);
  console.log('Matches account address?', recovered.toLowerCase() === account.address.toLowerCase());

  const client = createPublicClient({ chain: foundry, transport: http(RPC_URL) });
  const POOL_ABI = [
    { name: 'backendSigner', type: 'function', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
    { name: 'joinPool', type: 'function', inputs: [{ name: 'poolId', type: 'uint256' }, { name: 'userTier', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  ] as const;

  const onChainSigner = await client.readContract({
    address: MERIT_POOL,
    abi: POOL_ABI,
    functionName: 'backendSigner',
  });
  console.log('On-chain backendSigner:', onChainSigner);

  try {
    const sim = await client.simulateContract({
      address: MERIT_POOL,
      abi: POOL_ABI,
      functionName: 'joinPool',
      args: [BigInt(0), BigInt(userTier), signature],
      account: targetUser as `0x${string}`,
    });
    console.log('Simulation SUCCEEDED!', sim);
  } catch (err: any) {
    console.error('Simulation FAILED with reason:', err.shortMessage || err.message);
    if (err.cause) console.error('Cause:', err.cause);
  }
})();
