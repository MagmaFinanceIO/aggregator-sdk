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

export class MagmaDarkPool implements Dex {
  private published_at: string

  constructor(env: Env, published_at?: string) {
    this.published_at = published_at ?? (env === Env.Mainnet ? "0x56f72145f18db9709dc328f3e016d84cb775877527d1b3da2d8e740d60537795" : "")
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path

    const [func, coinAType, coinBType] = direction
      ? ["swap_x_2_y_aggregator", from, target]
      : ["swap_y_2_x_aggregator", target, from]

    const args = [
      txb.object(path.id),
      txb.pure.u64(path.amountIn),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${this.published_at}::saturation_curve::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }
}
