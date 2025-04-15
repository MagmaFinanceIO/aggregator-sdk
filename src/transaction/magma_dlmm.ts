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

export class MagmaDLMM implements Dex {
  private globalConfig: string
  private partner: string

  constructor(env: Env, partner?: string, globalConfig?: string) {
    this.globalConfig =
      globalConfig ??
      (env === Env.Mainnet
        ? "0x680dc99b0e428883e94518612484a7579a3de364af391307e37f63065b1524e2"
        : "0x61f231024561d4dcf9099986a6944dc4be35ee489bdc61a3252a831a06f20b9d")

    this.partner =
      partner ??
      (env === Env.Mainnet
        ? "0xe42e8c358149738b6f020696a78d911342e8334b1ec369097a96e5a49f7ef996"
        : "0x00bf176a399bd15edbfc8f1ed778733cf3162bd27259b5f765ca1a7a45486248")
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV4()}::magma_dlmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
