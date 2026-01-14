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
  pool: string
  in_amount: number
  indices: number[]
  use_amounts: number[]
  base_amounts: number[]
  siblings_list: string[][]
  directions_list: string[]
  min_out: number
  version: number
  deadline: number
}

export class MagmaDarkPool implements Dex {
  private published_at: string

  constructor(env: Env, published_at?: string) {
    this.published_at = published_at ?? (env === Env.Mainnet ? "" : "")
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
      pool,
      in_amount,
      indices,
      use_amounts,
      base_amounts,
      siblings_list,
      directions_list,
      min_out,
      version,
      deadline,
    } = path.extendedDetails.darkPoolProof

    const [func, coinAType, coinBType] = direction
      ? ["swap_x_to_y_with_proof_external", from, path.target]
      : ["swap_y_to_x_with_proof_external", target, from]

    // Build nested vector: directions_list: vector<vector<u8>>
    const directionsVectorElements = directions_list.map((s) =>
      txb.pure.vector("u8", Array.from(Buffer.from(s, "hex"))),
    )
    const directionsListVector = txb.makeMoveVec({
      elements: directionsVectorElements,
    })

    // Build nested vector: siblings_list: vector<vector<vector<u8>>>
    const siblingsVectorElements = siblings_list.map((siblings) =>
      txb.makeMoveVec({
        elements: siblings.map((s) =>
          txb.pure.vector("u8", Array.from(Buffer.from(s, "hex"))),
        ),
      }),
    )
    const siblingsListVector = txb.makeMoveVec({
      elements: siblingsVectorElements,
    })

    const args = [
      txb.object(pool), // self: &mut Pool<X, Y>
      inputCoin, // mut in_coin: Coin<X>
      txb.pure.u64(in_amount), // in_amount: u64
      txb.pure.vector("u64", indices), // indices: vector<u64>
      txb.pure.vector("u64", use_amounts), // use_amounts: vector<u64>
      txb.pure.vector("u64", base_amounts), // base_amounts: vector<u64>
      siblingsListVector, // siblings_list: vector<vector<vector<u8>>>
      directionsListVector, // directions_list: vector<vector<u8>>
      txb.pure.u64(min_out), // min_out: u64
      txb.pure.u64(version), // version: u64
      txb.pure.u64(deadline), // deadline: u64
      txb.object(CLOCK_ADDRESS), // clk: &Clock
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV4()}::ebola::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }
}
