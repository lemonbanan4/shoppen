import requests
import time
from google.cloud import firestore

# Initialize Firestore (uses default credentials from gcloud auth or GOOGLE_APPLICATION_CREDENTIALS)
db = firestore.Client()
COLLECTION_NAME = "competitor_deals"

def sync_shopify_to_firestore(store_url, store_name):
    base_url = store_url.rstrip('/')
    page = 1
    batch = db.batch()
    batch_count = 0
    total_synced = 0
    
    print(f"Starting sync for: {store_name}")
    
    while True:
        endpoint = f"{base_url}/products.json?limit=250&page={page}"
        
        try:
            res = requests.get(endpoint, headers={'User-Agent': 'Mozilla/5.0'})
            if res.status_code != 200:
                print(f"Failed to fetch {endpoint} (HTTP {res.status_code})")
                break
                
            products = res.json().get('products', [])
            if not products:
                break
                
            for product in products:
                product_id = str(product.get('id'))
                product_handle = product.get('handle', '')
                product_url = f"{base_url}/products/{product_handle}"
                tags = product.get('tags', [])
                if isinstance(tags, str):
                    tags = [t.strip() for t in tags.split(',')]
                    
                for variant in product.get('variants', []):
                    variant_id = str(variant.get('id'))
                    doc_id = f"{store_name}_{product_id}_{variant_id}".lower().replace(" ", "_")
                    
                    doc_ref = db.collection(COLLECTION_NAME).document(doc_id)
                    doc_data = {
                        "store_name": store_name,
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "title": product.get('title'),
                        "variant_title": variant.get('title'),
                        "product_type": product.get('product_type'),
                        "vendor": product.get('vendor'),
                        "price": float(variant.get('price', 0.0) or 0.0),
                        "compare_at_price": float(variant.get('compare_at_price') or 0.0) if variant.get('compare_at_price') else None,
                        "available": variant.get('available', False),
                        "tags": tags,
                        "product_url": product_url,
                        "updated_at": firestore.SERVER_TIMESTAMP
                    }
                    
                    batch.set(doc_ref, doc_data, merge=True)
                    batch_count += 1
                    total_synced += 1
                    
                    # Firestore batch limit is 500 writes
                    if batch_count >= 450:
                        batch.commit()
                        batch = db.batch()
                        batch_count = 0
            
            page += 1
            time.sleep(1.2)
            
        except Exception as e:
            print(f"Error reading {endpoint}: {e}")
            break
            
    # Commit remaining writes
    if batch_count > 0:
        batch.commit()
        
    print(f"Finished {store_name}: {total_synced} variants synced to Firestore.")

# Target store list
targets = {
    "Store_Example": "https://3360e8.myshopify.com"
}

for name, url in targets.items():
    sync_shopify_to_firestore(url, name)