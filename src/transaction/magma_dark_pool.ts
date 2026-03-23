import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, Path } from ".."

export type MagmaFlashSwapResult = {
  targetCoin: TransactionObjectArgument
  flashReceipt: TransactionObjectArgument
  payAmount: TransactionArgument
}

export type DarkPoolArg = {
  pool_id: string
  asks_root: string
  bids_root: string
  prices: number[]
  base_amounts: number[]
  siblings: string[][]
  directions: number[][]
  total_in: number
  total_out: number
  expires_at: number
}

export class MagmaDarkPool implements Dex {
  private published_at: string

  constructor(env: Env, published_at?: string) {
    this.published_at = published_at ?? (env === Env.Mainnet ? "0xb796d07fff819b75d1085514399130f0a94d039f76ceadb7a09153beee7f94a9" : "")
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path

    if (!path.extendedDetails?.darkPoolProof) {
      throw new Error("Dark pool proof is required for dark pool swap")
    }
    const {
      pool_id,
      prices,
      base_amounts,
      siblings,
      directions,
      total_in,
      total_out,
      expires_at,
    } = path.extendedDetails.darkPoolProof
    const min_out = 1

    const [func, coinAType, coinBType] = direction
      ? ["swap_x_to_y_with_proof_for_aggregator", from, target]
      : ["swap_y_to_x_with_proof_for_aggregator", target, from]

    const directionsListVector = txb.pure.vector('vector<u8>', directions)

    const siblingsListVector =
      siblings.map(row =>
        row.map(hexString => {
          return Array.from(Buffer.from(hexString.replace(/^0x|\s/g, ''), "hex"))
        })
      )
    const siblingsParams = txb.pure.vector('vector<vector<u8>>', siblingsListVector)

    const args = [
      txb.object(pool_id),
      inputCoin,
      txb.pure.u64(total_in),
      txb.pure.vector("u64", base_amounts),
      txb.pure.vector("u64", prices),
      siblingsParams,
      directionsListVector,
      txb.pure.u64(min_out),
      txb.pure.u64(expires_at),
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${this.published_at}::corona::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }
}
