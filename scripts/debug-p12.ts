/**
 * Debug: inspeciona conteúdo do P12
 */

import fs from 'fs'
const forge = require('node-forge')

const p12Path = '/home/umbrel/HealthCare/private/rafael_piazenski_icpbrasil.pfx'
const password = '314rafael'

try {
  const p12Bytes = fs.readFileSync(p12Path)
  console.log('✅ P12 carregado:', p12Bytes.length, 'bytes')

  const p12Asn1 = forge.asn1.fromDer(p12Bytes.toString('binary'), false)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

  console.log('\n📦 Conteúdo do P12:')
  
  // Listar todos os tipos de bags
  const bagTypes = Object.keys(forge.pki.oids).filter(key => key.includes('Bag'))
  
  for (const bagType of bagTypes) {
    const oid = forge.pki.oids[bagType]
    const bags = p12.getBags({ bagType: oid })
    if (bags[oid] && bags[oid].length > 0) {
      console.log(`\n  ${bagType} (${oid}): ${bags[oid].length} item(s)`)
    }
  }

  // Tentar extrair com diferentes tipos de chave
  console.log('\n🔑 Tentando extrair chaves...')
  
  const keyTypes = [
    forge.pki.oids.pkcs8ShroudedKeyBag,
    forge.pki.oids.keyBag,
    forge.pki.oids.rsaEncryptionOid,
  ]

  for (const keyType of keyTypes) {
    const bags = p12.getBags({ bagType: keyType })
    if (bags[keyType]) {
      console.log(`  ✅ Encontrou chave tipo ${keyType}: ${bags[keyType].length} item(s)`)
      if (bags[keyType][0]) {
        console.log('    Key:', bags[keyType][0].key ? 'SIM' : 'NÃO')
      }
    }
  }

  // Listar todas as chaves
  console.log('\n📋 Todas as chaves do P12:')
  const allKeys = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  if (allKeys[forge.pki.oids.pkcs8ShroudedKeyBag]) {
    allKeys[forge.pki.oids.pkcs8ShroudedKeyBag].forEach((bag: any, i: number) => {
      console.log(`  [${i}] key: ${bag.key ? 'YES' : 'NO'}`)
    })
  }

} catch (error) {
  console.error('❌ Erro:', error)
}
