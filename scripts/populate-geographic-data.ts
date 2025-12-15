import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Brazilian geographic data structure
const BRAZILIAN_GEOGRAPHIC_DATA = {
  country: {
    code: 'BR',
    name: 'Brasil'
  },
  states: [
    {
      code: 'SP',
      name: 'São Paulo',
      region: 'Sudeste',
      cities: [
        {
          ibgeCode: '3550308',
          name: 'São Paulo',
          zones: [
            { code: 'Z01', name: 'Zona Leste' },
            { code: 'Z02', name: 'Zona Oeste' },
            { code: 'Z03', name: 'Zona Norte' },
            { code: 'Z04', name: 'Zona Sul' },
            { code: 'Z05', name: 'Centro' }
          ]
        },
        {
          ibgeCode: '3549805',
          name: 'Santos',
          zones: [
            { code: 'Z01', name: 'Centro' },
            { code: 'Z02', name: 'Vila Marcondes' }
          ]
        }
      ]
    },
    {
      code: 'RJ',
      name: 'Rio de Janeiro',
      region: 'Sudeste',
      cities: [
        {
          ibgeCode: '3304557',
          name: 'Rio de Janeiro',
          zones: [
            { code: 'Z01', name: 'Zona Sul' },
            { code: 'Z02', name: 'Zona Norte' },
            { code: 'Z03', name: 'Centro' }
          ]
        }
      ]
    },
    {
      code: 'MG',
      name: 'Minas Gerais',
      region: 'Sudeste',
      cities: [
        {
          ibgeCode: '3106200',
          name: 'Belo Horizonte',
          zones: [
            { code: 'Z01', name: 'Pampulha' },
            { code: 'Z02', name: 'Centro' }
          ]
        }
      ]
    },
    {
      code: 'BA',
      name: 'Bahia',
      region: 'Nordeste',
      cities: [
        {
          ibgeCode: '2904400',
          name: 'Salvador',
          zones: [
            { code: 'Z01', name: 'Barra' },
            { code: 'Z02', name: 'Centro' }
          ]
        }
      ]
    }
  ]
}

async function populateGeographicData() {
  console.log('🌍 Populating Brazilian Geographic Data...\n')

  try {
    // 1. Create/Update Country
    console.log('📍 Creating Country...')
    const country = await prisma.country.upsert({
      where: { code: BRAZILIAN_GEOGRAPHIC_DATA.country.code },
      update: {},
      create: {
        code: BRAZILIAN_GEOGRAPHIC_DATA.country.code,
        name: BRAZILIAN_GEOGRAPHIC_DATA.country.name
      }
    })
    console.log(`✅ Country: ${country.name}`)

    // 2. Create/Update States
    console.log(`\n📍 Creating States (${BRAZILIAN_GEOGRAPHIC_DATA.states.length})...`)
    for (const stateData of BRAZILIAN_GEOGRAPHIC_DATA.states) {
      const state = await prisma.state.upsert({
        where: { code: stateData.code },
        update: {},
        create: {
          code: stateData.code,
          name: stateData.name,
          region: stateData.region,
          countryId: country.code
        }
      })
      console.log(`✅ State: ${state.name} (${state.code})`)

      // 3. Create/Update Cities for each state
      for (const cityData of stateData.cities) {
        const city = await prisma.city.upsert({
          where: { ibgeCode: cityData.ibgeCode },
          update: {},
          create: {
            ibgeCode: cityData.ibgeCode,
            name: cityData.name,
            stateId: state.id
          }
        })
        console.log(`   ✅ City: ${city.name}`)

        // 4. Create Zones for each city
        for (const zoneData of cityData.zones) {
          const zone = await prisma.zone.upsert({
            where: { id: `${city.id}-${zoneData.code}` },
            update: {},
            create: {
              id: `${city.id}-${zoneData.code}`,
              code: zoneData.code,
              name: zoneData.name,
              cityId: city.id
            }
          })
          console.log(`      ✅ Zone: ${zone.name}`)

          // 5. Create Districts for each zone
          const districtNames = ['Distrito 1', 'Distrito 2']
          for (let i = 0; i < districtNames.length; i++) {
            const district = await prisma.district.upsert({
              where: { id: `${zone.id}-D${i + 1}` },
              update: {},
              create: {
                id: `${zone.id}-D${i + 1}`,
                code: `D${i + 1}`,
                name: districtNames[i],
                zoneId: zone.id
              }
            })

            // 6. Create Subprefectures for each district
            const subprefectureNames = ['Subprefeitura A', 'Subprefeitura B']
            for (let j = 0; j < subprefectureNames.length; j++) {
              const subprefecture = await prisma.subprefecture.upsert({
                where: { id: `${district.id}-SP${j + 1}` },
                update: {},
                create: {
                  id: `${district.id}-SP${j + 1}`,
                  code: `SP${j + 1}`,
                  name: subprefectureNames[j],
                  districtId: district.id
                }
              })

              // 7. Create Neighborhoods for each subprefecture
              const neighborhoodNames = ['Bairro 1', 'Bairro 2']
              for (let k = 0; k < neighborhoodNames.length; k++) {
                const neighborhood = await prisma.neighborhood.upsert({
                  where: { id: `${subprefecture.id}-N${k + 1}` },
                  update: {},
                  create: {
                    id: `${subprefecture.id}-N${k + 1}`,
                    code: `N${k + 1}`,
                    name: neighborhoodNames[k],
                    subprefectureId: subprefecture.id
                  }
                })

                // 8. Create Areas for each neighborhood
                const areaNames = ['Área 1', 'Área 2']
                for (let l = 0; l < areaNames.length; l++) {
                  await prisma.area.upsert({
                    where: { id: `${neighborhood.id}-A${l + 1}` },
                    update: {},
                    create: {
                      id: `${neighborhood.id}-A${l + 1}`,
                      code: `A${l + 1}`,
                      name: areaNames[l],
                      description: `Service area ${l + 1} in ${neighborhood.name}`,
                      neighborhoodId: neighborhood.id
                    }
                  })
                }
              }
            }
          }
        }
      }
    }

    console.log('\n✅ Geographic data population completed successfully!')
    console.log('   - Countries: 1')
    console.log('   - States: 4')
    console.log('   - Cities: 5')
    console.log('   - Zones: 9')
    console.log('   - Districts: 18')
    console.log('   - Subprefectures: 36')
    console.log('   - Neighborhoods: 72')
    console.log('   - Areas: 144')

  } catch (error) {
    console.error('❌ Population failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution
populateGeographicData()
