import scrapy
from urllib.parse import urljoin
from datetime import datetime

class CNNSpider(scrapy.Spider):
    name = "cnn"
    allowed_domains = ["edition.cnn.com"]
    start_urls = ["https://edition.cnn.com/"]

    def parse(self, response):
        sections = response.css("li.subnav__section > a::attr(href)").getall() 

        for section_url in sections:
            full_section_url = urljoin(response.url, section_url)
            section_name = section_url.split("/")[-1].capitalize()

            yield scrapy.Request(
                url=full_section_url,
                callback=self.parse_section,
                meta={"category": section_name}
            )

            subsections = response.css(f'a[href="{section_url}"] + ul.subnav__subsections a::attr(href)').getall()
            for subsection_url in subsections:
                full_subsection_url = urljoin(response.url, subsection_url)
                subsection_name = subsection_url.split("/")[-1].capitalize()

                yield scrapy.Request(
                    url=full_subsection_url,
                    callback=self.parse_section,
                    meta={"category": f"{section_name} > {subsection_name}"}
                )

    def parse_section(self, response):
        category = response.meta.get("category", "Unknown")
        self.logger.info(f"Parsing section/subsection: {category} - URL: {response.url}")

        article_links = response.css("a.container__link::attr(href)").getall()

        for link in article_links:
            if "/video/" in link or "/gallery/" in link:
                continue
            full_url = urljoin(response.url, link)
            yield scrapy.Request(
                url=full_url,
                callback=self.parse_article,
                meta={"category": category}
            )

    def parse_publish_date(self, publish_date_str):
        try:
            if "Updated" in publish_date_str:
                publish_date_str = publish_date_str.replace("Updated", "").strip()
            
            time_part, date_part = publish_date_str.split(", ", 1)
            
            time_segments = time_part.split(" ")
            time = f"{time_segments[0]} {time_segments[1]}" 
            timezone = time_segments[-1]                    
            
            datetime_obj = datetime.strptime(date_part.strip(), "%a %B %d, %Y")
            
            result = {
                "time": time,
                "timezone": timezone,
                "hour": int(datetime.strptime(time, "%I:%M %p").strftime("%H")),
                "minute": int(datetime.strptime(time, "%I:%M %p").strftime("%M")),
                "day": datetime_obj.day,
                "month": datetime_obj.strftime("%B"),
                "month_number": datetime_obj.month,
                "year": datetime_obj.year,
                "weekday": datetime_obj.strftime("%A")
            }
            return result
        except Exception as e:
            return {
                "error": str(e),
                "original_publish_date": publish_date_str
            }
    
    
    def parse_article(self, response):
        unwanted_phrases = [
            "Sign up for CNN’s Wonder Theory",
            "Sign up here"
        ]

        # title = response.css("h1::text").get().strip()
        title = response.css("h1.headline__text::text").get()
        elements = response.css(
            'div.article__content-container div.article__content'
        ).xpath('.//p | .//h2')

        paragraphs = [el.xpath('string(.)').get().strip() for el in elements]
        filtered_paragraphs = [
            p for p in paragraphs
            if not any(phrase in p for phrase in unwanted_phrases)
        ]
        content = " ".join(filtered_paragraphs)
        if "(CNN) —" in content:
            content = content[content.index("(CNN) —"):]

        image_url = response.css("meta[property='og:image']::attr(content)").get()

        pub = response.css('div.timestamp__published::text').get()
        if pub:
            publish_date = pub.replace("PUBLISHED", "").strip()
        else:
            pub_v = response.css('div.timestamp.vossi-timestamp::text').get()
            publish_date = pub_v.replace("Published", "").strip() if pub_v else "No publish date"

        parsed_date  = self.parse_publish_date(publish_date)

        tr = response.css("div.headline__sub-description::text").get()
        time_reading = tr.strip() if tr else "No reading time"

        authors = response.css("div.byline__names .byline__name::text").getall()
        author = ", ".join(a.strip() for a in authors) if authors else "No author"

        category = response.meta.get("category", "No category")
        category_array = category.split(" > ")
        
        yield {
            "url": response.url or "No URL",
            "src": "edition.cnn.com",
            "language": "english",
            "categories": category_array,
            "title": title or "No title",
            "content": content or "No content",
            "image_url": image_url or "No image available",
            "publish_date": publish_date,
            "time": parsed_date.get("time"),
            "timezone": parsed_date.get("timezone"),
            "hour": parsed_date.get("hour"),
            "minute": parsed_date.get("minute"),
            "day": parsed_date.get("day"),
            "month": parsed_date.get("month"),
            "month_number": parsed_date.get("month_number"),
            "year": parsed_date.get("year"),
            "weekday": parsed_date.get("weekday"),
            "time_reading": time_reading,
            "author": author,
        }

    