from supabase import create_client, Client
import os
from dotenv import load_dotenv
load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# get all data from Article table
response = supabase.table("control_table").select("*").execute()

print(response.data)
