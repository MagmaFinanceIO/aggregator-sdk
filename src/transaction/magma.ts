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

export class Magma implements Dex {
  private globalConfig: string
  private partner: string

  constructor(env: Env, partner?: string, globalConfig?: string) {
    this.globalConfig =
      globalConfig ??
      (env === Env.Mainnet
        ? "0x4c4e1402401f72c7d8533d0ed8d5f8949da363c7a3319ccef261ffe153d32f8a"
        : "0x61f231024561d4dcf9099986a6944dc4be35ee489bdc61a3252a831a06f20b9d")

    this.partner =
      partner ??
      (env === Env.Mainnet
        ? "0x62ffdbc74413b9d1544d9c91fa068f4fa3fd4c47c1f92f3c8d4c817e1591cad9"
        : "0x00bf176a399bd15edbfc8f1ed778733cf3162bd27259b5f765ca1a7a45486248")
  }

  flash_swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    by_amount_in: boolean,
  ): MagmaFlashSwapResult {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["flash_swap_a2b", from, target]
      : ["flash_swap_b2a", target, from]
    let amount = by_amount_in ? path.amountIn : path.amountOut
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      txb.pure.u64(amount),
      txb.pure.bool(by_amount_in),
      txb.object(CLOCK_ADDRESS),
    ]
    const res: TransactionObjectArgument[] = txb.moveCall({
      target: `${client.publishedAtV5()}::magma_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return {
      targetCoin: res[0],
      flashReceipt: res[1],
      payAmount: res[2],
    }
  }

  repay_flash_swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    receipt: TransactionArgument,
  ): TransactionObjectArgument {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["repay_flash_swap_a2b", from, target]
      : ["repay_flash_swap_b2a", target, from]
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      receipt,
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV5()}::magma_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
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
      target: `${client.publishedAtV5()}::magma_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
  }
}
