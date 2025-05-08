from pymilvus import connections, utility
from pymilvus import FieldSchema, CollectionSchema, DataType, Collection
import os
from dotenv import load_dotenv

load_dotenv()

connections.connect("default", host="localhost", port="19530")  
print("Connected to Milvus")

collection_name = os.getenv("COLLECTION_NAME")
collection = Collection(name=collection_name)

# if utility.has_collection(collection_name):
#     utility.drop_collection(collection_name)

num_vectors = collection.num_entities
print(f"Số lượng vectors trong collection: {num_vectors}")

index_info = collection.index()
print(f"Index: {index_info}")

result = collection.query(
    expr="", 
    output_fields=["article_id","article_embed", "title", "url", "publish_date"],
    limit=10
)
print(result)

# print(collection.schema)
