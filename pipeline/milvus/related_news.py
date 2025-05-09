from pymilvus import connections, utility, Collection
import os
from fastapi import FastAPI, HTTPException
from typing import List
import uvicorn

load_dotenv()

def connect_to_milvus():
    connections.connect(
        alias="default",
        uri=os.getenv("ZILLIZ_URI"),
        token=os.getenv("ZILLIZ_TOKEN"),
        secure=True
    )
    print("Connected to Milvus")

@app.get("/related_articles/{url}")
def get_related_news(article_id: int, top_k: int=5, sort_by_recent: bool = True):
    result = collection.query(
        expr=f"article_id == {article_id}",
        output_fields=["article_embed"]
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Article not found")
    
    target_vector = result[0]["article_embed"]
    
    # find related vectors
    search_params = {"metric_type": "COSINE", "params:" {"ef": 200} }
    collection.load()
    search_results = collection.search(
                            data=[target_vector],
                            anns_field='article_embed',
                            param=search_params,
                            limit=top_k+5,
                            output_fields=["article_id", "url", "publish_date"]
    ) 
    
    # filter the origin article
    res = [
        {
            "article_id": res.entity.get("article_id"),
            "url": res.entity.get("url"),
            "publish_date": res.entity.get("publish_date"),
            "similar_score": res.distance
        }
        for res in search_results[0]
        if res.entity.get("article_id") != article_id
    ]
    
    # get the lastest articles
    if sort_by_recent:
        res = sorted(res, key=lambda x: x["publish_date"], reverse=True)
    
    return {"related_articles": hits[:top_k]}
           
    
if __name__ == "__main__":
    app = FastAPI()
    
    connect_to_milvus()
    
    collection = Collection("articles")
    collection.load()
