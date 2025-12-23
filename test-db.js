// Script de test pour vérifier la connexion Supabase et la structure des tables
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(filePath) {
  try {
    const abs = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(abs)) return;
    const content = fs.readFileSync(abs, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      value = value.replace(/^"|"$/g, '');
      value = value.replace(/^'|'$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

loadEnvFile('.env.local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Test de connexion Supabase...\n');

  // Test 1: Vérifier la table PRODUITS
  console.log('1️⃣ Test table PRODUITS...');
  const { data: produits, error: produitsError } = await supabase
    .from('PRODUITS')
    .select('id, nom, SKU_EURO, activite, categorie')
    .limit(1);

  if (produitsError) {
    console.error('❌ Erreur PRODUITS:', produitsError);
  } else {
    console.log('✅ PRODUITS OK');
    if (produits && produits.length > 0) {
      console.log('   Colonnes:', Object.keys(produits[0]));
    }
  }

  // Test 2: Vérifier la table CATEGORIES
  console.log('\n2️⃣ Test table CATEGORIES...');
  const { data: categories, error: categoriesError } = await supabase
    .from('CATEGORIES')
    .select('id, categorie_nom')
    .limit(1);

  if (categoriesError) {
    console.error('❌ Erreur CATEGORIES:', categoriesError);
  } else {
    console.log('✅ CATEGORIES OK');
    if (categories && categories.length > 0) {
      console.log('   Colonnes:', Object.keys(categories[0]));
    }
  }

  // Test 3: Vérifier la table PRIX
  console.log('\n3️⃣ Test table PRIX...');
  const { data: prix, error: prixError } = await supabase
    .from('PRIX')
    .select('*')
    .limit(1);

  if (prixError) {
    console.error('❌ Erreur PRIX:', prixError);
  } else {
    console.log('✅ PRIX OK');
    if (prix && prix.length > 0) {
      console.log('   Colonnes:', Object.keys(prix[0]));
    }
  }

  // Test 4: Vérifier la table CONF_PRODUITS
  console.log('\n4️⃣ Test table CONF_PRODUITS...');
  const { data: conf, error: confError } = await supabase
    .from('CONF_PRODUITS')
    .select('*')
    .limit(1);

  if (confError) {
    console.error('❌ Erreur CONF_PRODUITS:', confError);
  } else {
    console.log('✅ CONF_PRODUITS OK');
    if (conf && conf.length > 0) {
      console.log('   Colonnes:', Object.keys(conf[0]));
    }
  }

  // Test 5: Vérifier la table panier_dropshipping
  console.log('\n5️⃣ Test table panier_dropshipping...');
  const { data: panier, error: panierError } = await supabase
    .from('panier_dropshipping')
    .select('*')
    .limit(1);

  if (panierError) {
    console.error('❌ Erreur panier_dropshipping:', panierError);
  } else {
    console.log('✅ panier_dropshipping OK');
    if (panier && panier.length > 0) {
      console.log('   Colonnes:', Object.keys(panier[0]));
    }
  }

  // Test 6: Vérifier la table shopify_config
  console.log('\n6️⃣ Test table shopify_config...');
  const { data: shopify, error: shopifyError } = await supabase
    .from('shopify_config')
    .select('*')
    .limit(1);

  if (shopifyError) {
    console.error('❌ Erreur shopify_config:', shopifyError);
  } else {
    console.log('✅ shopify_config OK');
    if (shopify && shopify.length > 0) {
      console.log('   Colonnes:', Object.keys(shopify[0]));
    }
  }

  // Test 7: Test requête complexe (comme dans l'API)
  console.log('\n7️⃣ Test requête complexe avec jointures...');
  const { data: complex, error: complexError } = await supabase
    .from('PRODUITS')
    .select(`
      id,
      nom,
      SKU_EURO,
      categorie,
      IMAGES_PRODUITS(image_url),
      PRIX(Prix_A, Prix_C, Prix_D, Prix_remise),
      CONF_PRODUITS(dropshipping),
      COLIS(*),
      CATEGORIES(id, categorie_nom)
    `)
    .eq('activite', true)
    .limit(1);

  if (complexError) {
    console.error('❌ Erreur requête complexe:', complexError);
  } else {
    console.log('✅ Requête complexe OK');
    if (complex && complex.length > 0) {
      console.log('   Structure:', JSON.stringify(complex[0], null, 2));
    }
  }

  console.log('\n✅ Tests terminés');
}

testDatabase().catch(console.error);
