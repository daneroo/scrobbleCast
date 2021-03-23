# Goodreads RSS parser

Turns out the Goodreads API is locked down. But the RSS feed url contains the xml version of my feed (with a `key` param).

Also by including a `page=X` url param I can fetch more than 100 items (by pages of 100).

## TODO

- Parse the dates
- Check out the `lastBuildDate`s if I modify old items
- Multiple read dates - find and test
- Validation any possibly repeated items?, dates?, other scale type projection
- Empty fields (shelf,dates,..)
- mapping: userShelve: ''->read
- Make primary key obvious
  - ISBN is not unique but bookId seems to be, there is another identifier in the feed url

```bash
cat data/books/2021-03-23T06.16.50Z/goodreads-rss-2021-03-23T06.16.50Z.json |jq '.items[].bookId'|sort |uniq -c
```
