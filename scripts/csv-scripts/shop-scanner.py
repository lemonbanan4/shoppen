import requests
import pandas as pd
import time

def scrape_shopify_store(store_url, store_name):
    base_url = store_url.rstrip('/')
    products_data = []
    page = 1
    
    print(f"Scraping {store_name}...")
    
    while True:
        # Shopify's public JSON endpoint allows up to 250 products per page
        endpoint = f"{base_url}/products.json?limit=250&page={page}"
        
        try:
            response = requests.get(endpoint, headers={'User-Agent': 'Mozilla/5.0'})
            if response.status_code != 200:
                print(f"Failed to fetch {endpoint} - Status {response.status_code}")
                break
                
            data = response.json()
            products = data.get('products', [])
            
            # Break the loop when a page returns an empty array
            if not products:
                break
                
            for product in products:
                product_url = f"{base_url}/products/{product.get('handle')}"
                tags = ", ".join(product.get('tags', []))
                
                for variant in product.get('variants', []):
                    products_data.append({
                        'Store_Name': store_name,
                        'Product_Title': product.get('title'),
                        'Product_Type': product.get('product_type'),
                        'Vendor': product.get('vendor'),
                        'Published_At': product.get('published_at'),
                        'Variant_Title': variant.get('title'),
                        'Price': variant.get('price'),
                        'Compare_At_Price': variant.get('compare_at_price'),
                        'Available': variant.get('available'),
                        'Tags': tags,
                        'Product_URL': product_url
                    })
            
            page += 1
            time.sleep(1.5)  # Respect rate limits between pagination calls
            
        except Exception as e:
            print(f"Error scraping {endpoint}: {e}")
            break
            
    return products_data

# Add the URLs of the competitors you identified
target_stores = {
    "Competitor A": "https://competitorA.com",
    "Competitor B": "https://competitorB.myshopify.com"
}

all_products = []
for name, url in target_stores.items():
    all_products.extend(scrape_shopify_store(url, name))

# Export to CSV
if all_products:
    df = pd.DataFrame(all_products)
    df.to_csv("competitor_prices.csv", index=False)
    print(f"Successfully saved {len(df)} variants to competitor_prices.csv!")
else:
    print("No products were found.")