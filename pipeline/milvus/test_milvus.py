from pymilvus import connections, utility
from pymilvus import FieldSchema, CollectionSchema, DataType, Collection
import os
from dotenv import load_dotenv

load_dotenv()

def connect_to_milvus():
    connections.connect(
        alias="default",
        uri=os.getenv("ZILLIZ_URI"),
        token=os.getenv("ZILLIZ_TOKEN"),
        secure=True
    )
    print("Connected to Milvus")

# collection_name = os.getenv("COLLECTION_NAME")
# collection = Collection(name=collection_name)

# if utility.has_collection(collection_name):
#     utility.drop_collection(collection_name)

# num_vectors = collection.num_entities
# print(f"Số lượng vectors trong collection: {num_vectors}")



# result = collection.query(
#     expr="", 
#     output_fields=["article_id","article_embed", "title", "url", "publish_date"],
#     limit=10
# )
# print(result)

# print(collection.schema)

# change index
# index_info = collection.index()
# print(f"Index: {index_info}")

# collection.release()

# collection.drop_index()

# index_params = {
#     "metric_type": "COSINE",
#     "index_type": "HNSW",  
#     "params": {
#         "M": 32,
#         "efConstruction": 300,
#         "efSearch": 200
#     }
# }
# collection.create_index(field_name="article_embed", index_params=index_params)
# collection.load()