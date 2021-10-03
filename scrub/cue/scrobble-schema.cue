import "time"

#RFC3339Z: time.Format("2006-01-02T15:04:05.999999Z")
#YMDHMS:   time.Format("2006-01-02 15:04:05")

// #UUID: =~"^[[:xdigit]]{8}-[[:xdigit]]{4}-[[:xdigit]]{4}-[[:xdigit]]{4}-[[:xdigit]]{12}$"
#UUID:    =~"^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"
#URL:     =~"http[s]?://.*"
#SRCTYPE: "01-podcasts" | "02-podcasts" | "03-new_releases" | "04-in_progress"

// #MIME: "audio/mp3" | "audio/mpeg" | "audio/mp4"
#MIME: "audio/mp3" | "audio/mpeg" | "video/mp4"

// #item: #base
#item: #podcast | #episode

#base: {
	"__user":             string
	"__stamp":            #RFC3339Z
	"__type":             "episode" | "podcast"
	uuid:                 #UUID
	"__sourceType":       #SRCTYPE
	url:                  #URL
	title:                string
	author?:              string
	description?:         string
	published_at?:        #YMDHMS | #RFC3339Z
	episodes_sort_order?: int | =~"^[0-9]+$"
	size?:                int | =~"^[0-9]+$"
	duration?:            int | =~"^[0-9]+$" | null
	file_type?:           #MIME
	podcast_id?:          number
	id?:                  null | number
	podcast_uuid?:        #UUID
	playing_status?:      number
	played_up_to?:        number | null
	is_deleted?:          bool | 0
	starred?:             bool | 0
	is_video?:            bool
}

#podcast: #base &{
	"__type":             "podcast"
	"__sourceType":       "01-podcasts"
}

#episode: #base & {
	"__type":             "episode"
	"__sourceType":       "02-podcasts" | "03-new_releases" | "04-in_progress"
}
