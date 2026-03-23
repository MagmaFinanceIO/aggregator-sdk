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
  indices: number[]
  use_amounts: number[]
  base_amounts: number[]
  siblings: string[][]
  directions: number[][]
  version: number
  total_in: number
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
      total_in,
      indices,
      use_amounts,
      base_amounts,
      siblings,
      directions,
      version,
    } = path.extendedDetails.darkPoolProof
    const min_out = 1
    const deadline = version + 500000

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
      txb.pure.vector("u64", indices), // indices: vector<u64>
      txb.pure.vector("u64", use_amounts), // use_amounts: vector<u64>
      txb.pure.vector("u64", base_amounts), // base_amounts: vector<u64>
      siblingsParams, // siblings_list: vector<vector<vector<u8>>>
      directionsListVector, // directions_list: vector<vector<u8>>
      txb.pure.u64(min_out), // min_out: u64
      txb.pure.u64(version), // version: u64
      txb.pure.u64(deadline), // deadline: u64
      txb.object(CLOCK_ADDRESS), // clk: &Clock
    ]
    const res = txb.moveCall({
      target: `${this.published_at}::corona::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }
}
