import { generateRegistrationOptions } from '@simplewebauthn/server'
import { randomUUID } from 'crypto'

async function run() {
    const userId = randomUUID()
    const userIdBuffer = new TextEncoder().encode(userId)

    const options = await generateRegistrationOptions({
        rpName: 'Test',
        rpID: 'localhost',
        userName: 'user@example.com',
        userID: userIdBuffer,
    })

    console.log(JSON.stringify(options, null, 2))
}

run().catch(console.error)
