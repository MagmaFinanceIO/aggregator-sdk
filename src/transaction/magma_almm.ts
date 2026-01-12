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

export class MagmaALMM implements Dex {
  private globalConfig: string
  private partner: string
  private almmfactory: string;

  constructor(env: Env, partner?: string, globalConfig?: string, almmfactory?: string) {
    this.globalConfig =
      globalConfig ??
      (env === Env.Mainnet
        ? "0x680dc99b0e428883e94518612484a7579a3de364af391307e37f63065b1524e2"
        : "0x61f231024561d4dcf9099986a6944dc4be35ee489bdc61a3252a831a06f20b9d")

    this.partner =
      partner ??
      (env === Env.Mainnet
        ? "0x93635b84915696cab5e87ec04513fd782dee7f1ca6930b4577d42ccf1b585cea"
        : "0x93635b84915696cab5e87ec04513fd782dee7f1ca6930b4577d42ccf1b585cea")
    this.almmfactory =
      almmfactory ??
      (env === Env.Mainnet ? "0x29999aadee09eb031cc98a73b605805306d6ae0fe9d5099fb9e6628d99527234" : "");
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
      : ["swap_b2a", target, from];
    // adapter testnet without almmfactory
    const exArgs = (this.almmfactory ? [txb.object(this.almmfactory)] : []);
    const args = [
      ...exArgs,
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV4()}::magma_almm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }
}
