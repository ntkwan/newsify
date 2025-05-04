import scrapy
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule
from dateutil.parser import parse as parse_date
from bs4 import BeautifulSoup
import logging
import re

class NBCSpider(CrawlSpider):
    name = 'nbc'
    allowed_domains = ['nbcnews.com']
    start_urls = [
        'https://www.nbcnews.com',
        'https://www.nbcnews.com/news/us-news',
        'https://www.nbcnews.com/politics/2024-election',
        'https://www.nbcnews.com/politics',
        'https://www.nbcnews.com/world',
        'https://www.nbcnews.com/business',
        'https://www.nbcnews.com/sports',
        'https://www.nbcnews.com/investigations',
        'https://www.nbcnews.com/culture-matters',
        'https://www.nbcnews.com/health',
        'https://www.nbcnews.com/science',
        'https://www.nbcnews.com/tech-media',
        'https://www.nbcnews.com/weather',
        'https://www.nbcnews.com/select',
        'https://www.nbcnews.com/asian-america',
        'https://www.nbcnews.com/blk',
        'https://www.nbcnews.com/latino',
        'https://www.nbcnews.com/out',
    ]
    
    rules = (
        Rule(LinkExtractor(allow=(
            r'nbcnews\.com/(news/us-news|politics/2024-election|politics|world|business|sports|investigations|culture-matters|health|science|tech-media|weather|select|asian-america|blk|latino|out)/.*',
        )), follow=True),
        Rule(LinkExtractor(allow=(r'nbcnews\.com/.*-rcna\d+',)), callback='parse_article', follow=True),
    )

    SECTION_TO_CATEGORY = {
        'news/us-news': 'U.S. News',
        'politics/2024-election': 'Decision 2024',
        'politics': 'Politics',
        'world': 'World',
        'business': 'Business',
        'sports': 'Sports',
        'investigations': 'Investigations',
        'culture-matters': 'Culture & Trends',
        'health': 'Health',
        'science': 'Science',
        'tech-media': 'Tech',
        'weather': 'Weather',
        'select': 'NBC Select',
        'asian-america': 'NBC Asian America',
        'blk': 'NBC BLK',
        'latino': 'NBC Latino',
        'out': 'NBC OUT',
    }

    def get_categories_from_url_and_unibrow(self, url, response):
        categories = set()
        
        # Lấy categories chính từ URL
        for section_path, category in self.SECTION_TO_CATEGORY.items():
            if section_path in url:
                categories.add(category)
        subcategory = response.css('div.unibrow span::text, span[data-testid="unibrow-text"]::text').get()
        if subcategory:
            subcategory = subcategory.strip()
            if subcategory and subcategory.lower() != 'none':
                categories.add(subcategory)
        
        return list(categories) if categories else ['No category']

    def parse_article(self, response):
        title = response.css('h1.article-hero-headline__htag::text, h1::text').get()
        if not title:
            logging.warning(f"No title found for {response.url}, skipping...")
            return

        author_selectors = [
            'p[data-testid="byline"] span.byline-name::text',
            'div.styles_showBlogByline__ZgAaA p.styles_nameWrapper__hXI2W span.byline-name::text',
            'div[data-testid="byline-container"] span.byline-name::text',
            'div[data-testid="article-byline-inline"] span.byline-name::text',
            'div.byline span::text',
        ]
        
        authors = []
        author_source = 'None'
        for selector in author_selectors:
            author_texts = response.css(selector).getall()
            if author_texts:
                authors = [text.strip() for text in author_texts if text.strip()]
                author_source = selector
                break
        if not authors or len(authors) < 2:  
            soup = BeautifulSoup(response.text, 'html.parser')
            byline_spans = soup.select('span.byline-name')
            if byline_spans:
                authors = [span.get_text(strip=True) for span in byline_spans if span.get_text(strip=True)]
                author_source = 'BeautifulSoup'

        author = ', '.join(authors) if authors else 'No author'

        date_selectors = [
            ('div[data-testid="article-body-timestamp"] time::text', 'text'),
            ('time[data-testid="timestamp__datePublished"]::text', 'text'),
            ('div.styles_showBlogByline__ZgAaA time::text', 'text'),
            ('time[itemprop="datePublished"]::text', 'text'),
            ('meta[itemprop="datePublished"]::attr(content)', 'attr'),
        ]
       
        publish_date = None
        parsed_date = {}
        date_source = 'None'
        time_texts = response.css('time[data-testid="timestamp__datePublished"]::text').getall()
        
        for time_text in time_texts:
            if time_text and time_text.strip():
                time_text = re.sub(r'\s*/\s*', ' ', time_text)  
                time_text = time_text.strip()
                logging.debug(f"Cleaned time_text for {response.url}: '{time_text}'")
                if "Updated" in time_text:
                    match = re.search(r'Updated\s*(.*?)$', time_text)
                    if match:
                        publish_date = match.group(1).strip()
                        date_source = 'time[data-testid="timestamp__datePublished"]::text (updated)'
                        break
                else:
                    publish_date = time_text
                    date_source = 'time[data-testid="timestamp__datePublished"]::text'
                    break
        
        if not publish_date:
            for selector, type_ in date_selectors:
                if type_ == 'text':
                    time_text = response.css(selector).get()
                else:
                    time_text = response.css(selector).get()
                if time_text is not None and time_text.strip():
                    time_text = re.sub(r'\s*/\s*', ' ', time_text)
                    time_text = time_text.strip()
                    logging.debug(f"Raw time_text for {response.url} from {selector}: '{time_text}'")
                    if "Updated" in time_text:
                        match = re.search(r'Updated\s*(.*?)$', time_text)
                        if match:
                            publish_date = match.group(1).strip()
                            date_source = f"{selector} (updated)"
                            break
                    else:
                        publish_date = time_text
                        date_source = selector
                        break
                else:
                    logging.debug(f"No valid time_text for {response.url} from {selector}: '{time_text}'")

        if not publish_date:
            soup = BeautifulSoup(response.text, 'html.parser')
            time_tags = soup.select('time[data-testid="timestamp__datePublished"]')
            for time_tag in time_tags:
                time_text = time_tag.get_text(strip=True)
                if time_text:
                    time_text = re.sub(r'\s*/\s*', ' ', time_text)
                    time_text = time_text.strip()
                    if "Updated" in time_text:
                        match = re.search(r'Updated\s*(.*?)$', time_text)
                        if match:
                            publish_date = match.group(1).strip()
                            date_source = 'BeautifulSoup (updated)'
                            break
                    else:
                        publish_date = time_text
                        date_source = 'BeautifulSoup'
                        break
            logging.debug(f"BeautifulSoup time_text for {response.url}: '{publish_date}'")

        if publish_date:
            try:
                parsed = parse_date(publish_date, fuzzy=True)
                parsed_date = {
                    'time': parsed.strftime('%I:%M %p'),
                    'timezone': parsed.tzname() or 'Unknown',
                    'hour': parsed.hour,
                    'minute': parsed.minute,
                    'day': parsed.day,
                    'month': parsed.strftime('%B'),
                    'month_number': parsed.month,
                    'year': parsed.year,
                    'weekday': parsed.strftime('%A')
                }
            except Exception as e:
                parsed_date = {'error': str(e), 'original_publish_date': publish_date}
        else:
            publish_date = 'No publish date'

        # Content
        content = ''
        paragraphs = response.css('div.showblog-body__content p.body-graf, div.article-body__content p.body-graf, div.article-body p, div.article-body__content p')
        content_list = []
        for p in paragraphs:
            texts = p.xpath('.//text()[not(ancestor::div[contains(@class, "ad")])]').getall()
            clean_text = ''.join(texts).strip()
            if clean_text:
                content_list.append(clean_text)

        if not content_list:
            soup = BeautifulSoup(response.text, 'html.parser')
            article_body = soup.select_one('div.showblog-body__content, div.article-body__content, div.article-body')
            if article_body:
                for ad in article_body.find_all(['div'], class_=re.compile('ad|recommended-intersection-ref|taboola')):
                    ad.decompose()
                for p in article_body.find_all('p', class_=re.compile('body-graf|endmark')):
                    clean_text = p.get_text(strip=True)
                    if clean_text:
                        content_list.append(clean_text)
            else:
                logging.warning(f"No content found for {response.url}")

        content = '\n\n'.join(content_list) or 'No content'
        content_source = 'CSS selector' if paragraphs else 'BeautifulSoup'

        # categories
        categories = self.get_categories_from_url_and_unibrow(response.url, response)

        article = {
            'url': response.url,
            'src': 'nbcnews.com',
            'language': 'english',
            'categories': categories,
            'title': title.strip(),
            'content': content,
            'image_url': response.css('meta[property="og:image"]::attr(content)').get(default='No image available'),
            'publish_date': publish_date,
            'time': parsed_date.get('time', 'No time'),
            'timezone': parsed_date.get('timezone', 'No timezone'),
            'hour': parsed_date.get('hour', None),
            'minute': parsed_date.get('minute', None),
            'day': parsed_date.get('day', None),
            'month': parsed_date.get('month', None),
            'month_number': parsed_date.get('month_number', None),
            'year': parsed_date.get('year', None),
            'weekday': parsed_date.get('weekday', None),
            'time_reading': response.css('time[data-testid="article-read-time"]::text').get(default='No reading time').strip(),
            'author': author,
        }

        logging.info(f"Scraped article: {response.url} (Categories: {', '.join(categories)}, Content length: {len(content)}, Content source: {content_source}, Author: {author}, Author source: {author_source}, Date: {publish_date}, Date source: {date_source})")
        yield article