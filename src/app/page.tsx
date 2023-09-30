import Image from 'next/image'
import commandExecutor from './command-executor'

export default function Home() {
  commandExecutor()
  return (
      <body></body>
  )
}
