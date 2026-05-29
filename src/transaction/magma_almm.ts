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
  private almmfactory: string

  constructor(
    env: Env,
    partner?: string,
    globalConfig?: string,
    almmfactory?: string,
  ) {
    this.globalConfig =
      globalConfig ??
      (env === Env.Mainnet
        ? "0x4c4e1402401f72c7d8533d0ed8d5f8949da363c7a3319ccef261ffe153d32f8a"
        : "0x61f231024561d4dcf9099986a6944dc4be35ee489bdc61a3252a831a06f20b9d")

    this.partner =
      partner ??
      (env === Env.Mainnet
        ? "0x62ffdbc74413b9d1544d9c91fa068f4fa3fd4c47c1f92f3c8d4c817e1591cad9"
        : "0x93635b84915696cab5e87ec04513fd782dee7f1ca6930b4577d42ccf1b585cea")
    this.almmfactory =
      almmfactory ??
      (env === Env.Mainnet
        ? "0xedb456e93e423dd75a8ddebedd9974bb661195043027e32ce01649d6ccee74cf"
        : "")
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
      txb.object(this.almmfactory),
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV5()}::magma_almm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }
}
