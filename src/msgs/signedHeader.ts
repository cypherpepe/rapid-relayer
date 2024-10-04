import {
  Header,
  Commit,
  SignedHeader,
} from 'cosmjs-types/tendermint/types/types'
import { Timestamp } from 'cosmjs-types/google/protobuf/timestamp'
import { BlockIDFlag } from '@initia/initia.proto/tendermint/types/validator'
import { Chain } from 'src/chain'
import {
  BlockIdFlag,
  ReadonlyDateWithNanoseconds,
} from '@cosmjs/tendermint-rpc'

export async function getSignedHeader(
  chain: Chain,
  height?: number
): Promise<SignedHeader> {
  const commitRes = await chain.rpc.commit(height)
  const tmCommit = commitRes.commit

  const header = Header.fromPartial({
    ...commitRes.header,
    version: {
      block: BigInt(commitRes.header.version.block),
      app: BigInt(commitRes.header.version.app),
    },
    height: BigInt(commitRes.header.height),
    time: timestampFromDateNanos(commitRes.header.time),
    lastBlockId: {
      hash: commitRes.header.lastBlockId?.hash,
      partSetHeader: commitRes.header.lastBlockId?.parts,
    },
  })

  const signatures = tmCommit.signatures.map((sig) => ({
    ...sig,
    timestamp: sig.timestamp && timestampFromDateNanos(sig.timestamp),
    blockIdFlag: blockIdFlagConvert(sig.blockIdFlag),
  }))

  const commit = Commit.fromPartial({
    height: BigInt(tmCommit.height),
    round: tmCommit.round,
    blockId: {
      hash: tmCommit.blockId.hash,
      partSetHeader: tmCommit.blockId.parts,
    },
    signatures,
  })

  return SignedHeader.fromPartial({ header, commit })
}

function blockIdFlagConvert(flag: BlockIdFlag): BlockIDFlag {
  const flagMap: Record<BlockIdFlag, BlockIDFlag> = {
    [BlockIdFlag.Unknown]: BlockIDFlag.BLOCK_ID_FLAG_UNKNOWN,
    [BlockIdFlag.Absent]: BlockIDFlag.BLOCK_ID_FLAG_ABSENT,
    [BlockIdFlag.Commit]: BlockIDFlag.BLOCK_ID_FLAG_COMMIT,
    [BlockIdFlag.Nil]: BlockIDFlag.BLOCK_ID_FLAG_NIL,
  }
  return flagMap[flag] ?? BlockIDFlag.UNRECOGNIZED;
}

export function timestampFromDateNanos(
  date: ReadonlyDateWithNanoseconds
): Timestamp {
  const nanos = (date.getTime() % 1000) * 1000000 + (date.nanoseconds ?? 0)
  return Timestamp.fromPartial({
    seconds: BigInt(Math.floor(date.getTime() / 1000)),
    nanos,
  })
}
