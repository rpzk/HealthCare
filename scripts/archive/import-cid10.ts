import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// CID-10 principais categorias e códigos mais usados em atenção primária
const CID10_DATA = [
  // Capítulo I - Doenças infecciosas e parasitárias (A00-B99)
  { code: 'A00', display: 'Cólera', chapter: 'I' },
  { code: 'A01', display: 'Febres tifoide e paratifoide', chapter: 'I' },
  { code: 'A09', display: 'Diarreia e gastroenterite infecciosas', chapter: 'I' },
  { code: 'A15', display: 'Tuberculose respiratória', chapter: 'I' },
  { code: 'A90', display: 'Dengue', chapter: 'I' },
  { code: 'A91', display: 'Febre hemorrágica devida ao vírus do dengue', chapter: 'I' },
  { code: 'B15', display: 'Hepatite aguda A', chapter: 'I' },
  { code: 'B16', display: 'Hepatite aguda B', chapter: 'I' },
  { code: 'B17', display: 'Outras hepatites virais agudas', chapter: 'I' },
  { code: 'B18', display: 'Hepatite viral crônica', chapter: 'I' },
  { code: 'B20', display: 'HIV resultando em doenças infecciosas', chapter: 'I' },
  { code: 'B24', display: 'Doença pelo HIV não especificada', chapter: 'I' },
  { code: 'B34', display: 'Infecção viral de localização não especificada', chapter: 'I' },
  
  // Capítulo II - Neoplasias (C00-D48)
  { code: 'C18', display: 'Neoplasia maligna do cólon', chapter: 'II' },
  { code: 'C34', display: 'Neoplasia maligna dos brônquios e pulmões', chapter: 'II' },
  { code: 'C50', display: 'Neoplasia maligna da mama', chapter: 'II' },
  { code: 'C53', display: 'Neoplasia maligna do colo do útero', chapter: 'II' },
  { code: 'C61', display: 'Neoplasia maligna da próstata', chapter: 'II' },
  { code: 'D50', display: 'Anemia por deficiência de ferro', chapter: 'II' },
  
  // Capítulo IV - Doenças endócrinas (E00-E90)
  { code: 'E03', display: 'Hipotireoidismo', chapter: 'IV' },
  { code: 'E04', display: 'Bócio não-tóxico', chapter: 'IV' },
  { code: 'E05', display: 'Tireotoxicose (hipertireoidismo)', chapter: 'IV' },
  { code: 'E10', display: 'Diabetes mellitus tipo 1', chapter: 'IV' },
  { code: 'E11', display: 'Diabetes mellitus tipo 2', chapter: 'IV' },
  { code: 'E14', display: 'Diabetes mellitus não especificado', chapter: 'IV' },
  { code: 'E65', display: 'Obesidade localizada', chapter: 'IV' },
  { code: 'E66', display: 'Obesidade', chapter: 'IV' },
  { code: 'E78', display: 'Distúrbios do metabolismo de lipoproteínas', chapter: 'IV' },
  
  // Capítulo V - Transtornos mentais (F00-F99)
  { code: 'F10', display: 'Transtornos mentais por uso de álcool', chapter: 'V' },
  { code: 'F17', display: 'Transtornos mentais por uso de tabaco', chapter: 'V' },
  { code: 'F20', display: 'Esquizofrenia', chapter: 'V' },
  { code: 'F31', display: 'Transtorno afetivo bipolar', chapter: 'V' },
  { code: 'F32', display: 'Episódio depressivo', chapter: 'V' },
  { code: 'F33', display: 'Transtorno depressivo recorrente', chapter: 'V' },
  { code: 'F40', display: 'Transtornos fóbico-ansiosos', chapter: 'V' },
  { code: 'F41', display: 'Outros transtornos ansiosos', chapter: 'V' },
  { code: 'F41.0', display: 'Transtorno de pânico', chapter: 'V' },
  { code: 'F41.1', display: 'Ansiedade generalizada', chapter: 'V' },
  { code: 'F43', display: 'Reações ao estresse grave e transtornos de adaptação', chapter: 'V' },
  { code: 'F51', display: 'Distúrbios do sono não-orgânicos', chapter: 'V' },
  
  // Capítulo VI - Doenças do sistema nervoso (G00-G99)
  { code: 'G40', display: 'Epilepsia', chapter: 'VI' },
  { code: 'G43', display: 'Enxaqueca', chapter: 'VI' },
  { code: 'G44', display: 'Outras síndromes de cefaleia', chapter: 'VI' },
  { code: 'G47', display: 'Distúrbios do sono', chapter: 'VI' },
  
  // Capítulo VII - Doenças do olho (H00-H59)
  { code: 'H10', display: 'Conjuntivite', chapter: 'VII' },
  { code: 'H25', display: 'Catarata senil', chapter: 'VII' },
  { code: 'H40', display: 'Glaucoma', chapter: 'VII' },
  
  // Capítulo VIII - Doenças do ouvido (H60-H95)
  { code: 'H60', display: 'Otite externa', chapter: 'VIII' },
  { code: 'H65', display: 'Otite média não-supurativa', chapter: 'VIII' },
  { code: 'H66', display: 'Otite média supurativa', chapter: 'VIII' },
  
  // Capítulo IX - Doenças do aparelho circulatório (I00-I99)
  { code: 'I10', display: 'Hipertensão essencial (primária)', chapter: 'IX' },
  { code: 'I11', display: 'Doença cardíaca hipertensiva', chapter: 'IX' },
  { code: 'I20', display: 'Angina pectoris', chapter: 'IX' },
  { code: 'I21', display: 'Infarto agudo do miocárdio', chapter: 'IX' },
  { code: 'I25', display: 'Doença isquêmica crônica do coração', chapter: 'IX' },
  { code: 'I50', display: 'Insuficiência cardíaca', chapter: 'IX' },
  { code: 'I63', display: 'Infarto cerebral', chapter: 'IX' },
  { code: 'I64', display: 'Acidente vascular cerebral não especificado', chapter: 'IX' },
  { code: 'I83', display: 'Varizes dos membros inferiores', chapter: 'IX' },
  
  // Capítulo X - Doenças do aparelho respiratório (J00-J99)
  { code: 'J00', display: 'Resfriado comum', chapter: 'X' },
  { code: 'J01', display: 'Sinusite aguda', chapter: 'X' },
  { code: 'J02', display: 'Faringite aguda', chapter: 'X' },
  { code: 'J03', display: 'Amigdalite aguda', chapter: 'X' },
  { code: 'J04', display: 'Laringite e traqueíte agudas', chapter: 'X' },
  { code: 'J06', display: 'IVAS de localizações múltiplas', chapter: 'X' },
  { code: 'J10', display: 'Influenza por vírus identificado', chapter: 'X' },
  { code: 'J11', display: 'Influenza por vírus não identificado', chapter: 'X' },
  { code: 'J12', display: 'Pneumonia viral', chapter: 'X' },
  { code: 'J13', display: 'Pneumonia por Streptococcus pneumoniae', chapter: 'X' },
  { code: 'J15', display: 'Pneumonia bacteriana', chapter: 'X' },
  { code: 'J18', display: 'Pneumonia por microrganismo não especificado', chapter: 'X' },
  { code: 'J20', display: 'Bronquite aguda', chapter: 'X' },
  { code: 'J40', display: 'Bronquite não especificada', chapter: 'X' },
  { code: 'J44', display: 'DPOC', chapter: 'X' },
  { code: 'J45', display: 'Asma', chapter: 'X' },
  { code: 'J46', display: 'Estado de mal asmático', chapter: 'X' },
  
  // Capítulo XI - Doenças do aparelho digestivo (K00-K93)
  { code: 'K04', display: 'Doenças da polpa e dos tecidos periapicais', chapter: 'XI' },
  { code: 'K21', display: 'Doença do refluxo gastroesofágico', chapter: 'XI' },
  { code: 'K25', display: 'Úlcera gástrica', chapter: 'XI' },
  { code: 'K26', display: 'Úlcera duodenal', chapter: 'XI' },
  { code: 'K29', display: 'Gastrite e duodenite', chapter: 'XI' },
  { code: 'K30', display: 'Dispepsia funcional', chapter: 'XI' },
  { code: 'K35', display: 'Apendicite aguda', chapter: 'XI' },
  { code: 'K40', display: 'Hérnia inguinal', chapter: 'XI' },
  { code: 'K58', display: 'Síndrome do intestino irritável', chapter: 'XI' },
  { code: 'K59', display: 'Outros transtornos funcionais do intestino', chapter: 'XI' },
  { code: 'K80', display: 'Colelitíase', chapter: 'XI' },
  
  // Capítulo XII - Doenças da pele (L00-L99)
  { code: 'L20', display: 'Dermatite atópica', chapter: 'XII' },
  { code: 'L23', display: 'Dermatite alérgica de contato', chapter: 'XII' },
  { code: 'L30', display: 'Outras dermatites', chapter: 'XII' },
  { code: 'L40', display: 'Psoríase', chapter: 'XII' },
  { code: 'L50', display: 'Urticária', chapter: 'XII' },
  { code: 'L60', display: 'Transtornos das unhas', chapter: 'XII' },
  { code: 'L70', display: 'Acne', chapter: 'XII' },
  
  // Capítulo XIII - Doenças do sistema osteomuscular (M00-M99)
  { code: 'M15', display: 'Poliartrose', chapter: 'XIII' },
  { code: 'M16', display: 'Coxartrose (artrose do quadril)', chapter: 'XIII' },
  { code: 'M17', display: 'Gonartrose (artrose do joelho)', chapter: 'XIII' },
  { code: 'M19', display: 'Outras artroses', chapter: 'XIII' },
  { code: 'M25', display: 'Outros transtornos articulares', chapter: 'XIII' },
  { code: 'M47', display: 'Espondilose', chapter: 'XIII' },
  { code: 'M51', display: 'Transtornos de discos intervertebrais', chapter: 'XIII' },
  { code: 'M54', display: 'Dorsalgia', chapter: 'XIII' },
  { code: 'M54.5', display: 'Dor lombar baixa', chapter: 'XIII' },
  { code: 'M62', display: 'Outros transtornos musculares', chapter: 'XIII' },
  { code: 'M75', display: 'Lesões do ombro', chapter: 'XIII' },
  { code: 'M79', display: 'Outros transtornos de tecidos moles', chapter: 'XIII' },
  
  // Capítulo XIV - Doenças do aparelho geniturinário (N00-N99)
  { code: 'N10', display: 'Nefrite túbulo-intersticial aguda', chapter: 'XIV' },
  { code: 'N18', display: 'Doença renal crônica', chapter: 'XIV' },
  { code: 'N20', display: 'Cálculo do rim e do ureter', chapter: 'XIV' },
  { code: 'N30', display: 'Cistite', chapter: 'XIV' },
  { code: 'N39', display: 'Outros transtornos do trato urinário', chapter: 'XIV' },
  { code: 'N39.0', display: 'Infecção do trato urinário', chapter: 'XIV' },
  { code: 'N40', display: 'Hiperplasia da próstata', chapter: 'XIV' },
  { code: 'N76', display: 'Outras afecções inflamatórias da vagina e vulva', chapter: 'XIV' },
  { code: 'N92', display: 'Menstruação excessiva, frequente e irregular', chapter: 'XIV' },
  { code: 'N94', display: 'Dor e outras afecções do trato genital feminino', chapter: 'XIV' },
  
  // Capítulo XV - Gravidez, parto e puerpério (O00-O99)
  { code: 'O00', display: 'Gravidez ectópica', chapter: 'XV' },
  { code: 'O03', display: 'Aborto espontâneo', chapter: 'XV' },
  { code: 'O14', display: 'Pré-eclâmpsia', chapter: 'XV' },
  { code: 'O24', display: 'Diabetes mellitus na gravidez', chapter: 'XV' },
  { code: 'O80', display: 'Parto único espontâneo', chapter: 'XV' },
  { code: 'Z32', display: 'Exame e teste de gravidez', chapter: 'XXI' },
  { code: 'Z34', display: 'Supervisão de gravidez normal', chapter: 'XXI' },
  
  // Capítulo XVIII - Sintomas e sinais (R00-R99)
  { code: 'R00', display: 'Anormalidades do batimento cardíaco', chapter: 'XVIII' },
  { code: 'R05', display: 'Tosse', chapter: 'XVIII' },
  { code: 'R06', display: 'Anormalidades da respiração', chapter: 'XVIII' },
  { code: 'R07', display: 'Dor de garganta e no peito', chapter: 'XVIII' },
  { code: 'R10', display: 'Dor abdominal e pélvica', chapter: 'XVIII' },
  { code: 'R11', display: 'Náusea e vômitos', chapter: 'XVIII' },
  { code: 'R42', display: 'Tontura e instabilidade', chapter: 'XVIII' },
  { code: 'R50', display: 'Febre de origem desconhecida', chapter: 'XVIII' },
  { code: 'R51', display: 'Cefaleia', chapter: 'XVIII' },
  { code: 'R52', display: 'Dor não classificada em outra parte', chapter: 'XVIII' },
  { code: 'R53', display: 'Mal-estar e fadiga', chapter: 'XVIII' },
  
  // Capítulo XIX - Lesões e causas externas (S00-T98)
  { code: 'S00', display: 'Traumatismo superficial da cabeça', chapter: 'XIX' },
  { code: 'S01', display: 'Ferimento da cabeça', chapter: 'XIX' },
  { code: 'S02', display: 'Fratura do crânio e ossos da face', chapter: 'XIX' },
  { code: 'S06', display: 'Traumatismo intracraniano', chapter: 'XIX' },
  { code: 'S42', display: 'Fratura do ombro e do braço', chapter: 'XIX' },
  { code: 'S52', display: 'Fratura do antebraço', chapter: 'XIX' },
  { code: 'S62', display: 'Fratura ao nível do punho e da mão', chapter: 'XIX' },
  { code: 'S72', display: 'Fratura do fêmur', chapter: 'XIX' },
  { code: 'S82', display: 'Fratura da perna', chapter: 'XIX' },
  { code: 'S92', display: 'Fratura do pé', chapter: 'XIX' },
  { code: 'T78', display: 'Efeitos adversos não classificados em outra parte', chapter: 'XIX' },
  
  // Capítulo XXI - Fatores que influenciam o estado de saúde (Z00-Z99)
  { code: 'Z00', display: 'Exame geral e investigação de pessoas sem queixas', chapter: 'XXI' },
  { code: 'Z01', display: 'Outros exames e investigações especiais', chapter: 'XXI' },
  { code: 'Z23', display: 'Necessidade de imunização contra doença bacteriana única', chapter: 'XXI' },
  { code: 'Z30', display: 'Anticoncepção', chapter: 'XXI' },
  { code: 'Z71', display: 'Pessoas em contato com serviços de saúde para aconselhamento', chapter: 'XXI' },
  { code: 'Z76', display: 'Pessoas em contato com serviços de saúde em outras circunstâncias', chapter: 'XXI' },
]

async function main() {
  console.log('Iniciando importação de CID-10...')
  
  let created = 0
  let skipped = 0
  
  for (const item of CID10_DATA) {
    try {
      await prisma.medicalCode.upsert({
        where: { 
          code_codingSystem: { code: item.code, codingSystem: 'CID10' }
        },
        update: {
          display: item.display,
          description: `Capítulo ${item.chapter}`,
        },
        create: {
          code: item.code,
          display: item.display,
          codingSystem: 'CID10',
          description: `Capítulo ${item.chapter}`,
          isActive: true,
        }
      })
      created++
    } catch (e: any) {
      console.error(`Erro ao inserir ${item.code}: ${e.message}`)
      skipped++
    }
  }
  
  console.log(`CID-10: ${created} códigos importados, ${skipped} ignorados`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
