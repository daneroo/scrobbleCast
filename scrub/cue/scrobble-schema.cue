import "time"

// Top Level is an array of #item
[...#item]

#item: #base
// #item: #podcast | #episode

#base: {
	"__type":             "episode" | "podcast"
	"__sourceType":       #SRCTYPE
	"__user":             string
	"__stamp":            #RFC3339Z
	uuid:                 #UUID
	url:                  #URL | null
	title:                string
	id?:                  int | null
	author?:              string | null
	description?:         string | null
	published_at?:        #YMDHMS | #RFC3339Z // episode only
	episodes_sort_order?: int | =~"^[0-9]+$"
	size?:                int | =~"^[0-9]+$" | null
	duration?:            int | =~"^[0-9]+$" | null
	file_type?:           #MIME
	podcast_id?:          number
	podcast_uuid?:        #UUID
	playing_status?:      number | null
	played_up_to?:        number | null
	is_deleted?:          bool | 0
	starred?:             bool | 0
	is_video?:            bool
	autoSkipLast?:        0
	thumbnail_url?:       #URL | null
}

#podcast: #base & {
	"__type":            "podcast"
	"__sourceType":      "01-podcasts"
	id?:                 int | null
	// author:              string
	// description:         string | null
	// author:              string
	// thumbnail_url?:      #URL
	// autoSkipLast:        0
	// episodes_sort_order: 3 //int | =~"^[0-9]+$"
}

#episode: #base & {
	"__type":       "episode"
	"__sourceType": "02-podcasts" | "03-new_releases" | "04-in_progress"

	// "__user":  string
	// "__stamp": #RFC3339Z
	// uuid:      #UUID
	// url:       #URL
	// title:     string
	// author?:              string
	// description?:         string
	// published_at?:        #YMDHMS | #RFC3339Z // episode only
	// episodes_sort_order?: int | =~"^[0-9]+$"
	// size?:                int | =~"^[0-9]+$"
	// duration?:            int | =~"^[0-9]+$" | null
	// file_type?:           #MIME
	// podcast_id?:          number
	// id?:                  null | number
	// podcast_uuid?:        #UUID
	// playing_status?:      number
	// played_up_to?:        number | null
	// is_deleted?:          bool | 0
	// starred?:             bool | 0
	// is_video?:            bool
	// autoSkipLast?:        0
	// thumbnail_url?:       #URL
}

// field types
#RFC3339Z: time.Format("2006-01-02T15:04:05.999999Z")
#YMDHMS:   time.Format("2006-01-02 15:04:05")

// N'importe quoi: ww -  /path/to/something.png
// #URL:     =~"(http[s]?:)?//.*"
#URL:     string

// #UUID: =~"^[[:xdigit]]{8}-[[:xdigit]]{4}-[[:xdigit]]{4}-[[:xdigit]]{4}-[[:xdigit]]{12}$"
#UUID:    =~"^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"
#SRCTYPE: "01-podcasts" | "02-podcasts" | "03-new_releases" | "04-in_progress"

// #MIME: "audio/mp3" | "audio/mpeg" | "audio/mp4"
#MIME: 	"audio/aac" |
	"audio/mp3" |
	"audio/mp4" |
	"audio/mpeg" |
	"audio/wav" |
	"audio/x-aiff" |
	"audio/x-m4a" |
	"audio/x-mpeg" |
	"video/mp4" |
	"video/mpeg" |
	"video/quicktime" |
	"video/x-m4v" |
	"video/x-mp4" |
	"video/x-ms-asf"