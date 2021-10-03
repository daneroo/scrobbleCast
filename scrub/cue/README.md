# Scrobble Cast CUE validation

- Take a sample of our `jsonl` file and validate with cue

Take a sample and validate:

```bash
mkdir -p sample
scp ../../js/data/snapshots/monthly/daniel/monthly-daniel-2014-11-01T00\:00\:00Z.jsonl sample/scrobble-sample.jsonl

cue vet -d "#item" scrobble-schema.cue ./sample/scrobble-sample.jsonl
```

Convert to cue:

```bash
cue import -f --list ./sample/scrobble-sample.jsonl

# validate
cue vet scrobble-schema.cue ./sample/scrobble-sample.cue
```

## Actual Data

```bash
mkdir data
# get a copy of the data
scp -rp ../../js/data/snapshots data/
# rename jsonl files to remove colons (:)
for i in $(find data/snapshots/monthly -name "monthly*.jsonl"); do
  nu=$(echo $i | sed 's/T00:00:00Z//')
  echo mv $i $nu
  mv $i $nu
done

# now import into cue - make .cue from .jsonl
for i in $(find data/snapshots/monthly -name "monthly*.jsonl"); do
  cue import -f --list $i
  cue=$(echo $i | sed 's/\.jsonl$/\.cue/')

  # lengths
  wcl=$(cat $i | wc -l)
  jql=$(cat $i | jq -s length)
  cl=$(cue export $cue | jq length)
  echo processed $(basename $i) - wc: $wcl jq: $jql cue: $cl
done

for jsonl in $(find data/snapshots/monthly -name "monthly*.jsonl" | sort); do
  echo Vetting $jsonl
  cue vet -d "#item" scrobble-schema.cue $jsonl
done

for cue in $(find data/snapshots/monthly -name "monthly*.cue" | sort); do
  echo Vetting $cue
  cue vet scrobble-schema.cue $cue
done

# Working incrementally
for cue in $(find data/snapshots/monthly -name "monthly*2014*.cue" | sort); do
  echo Vetting $cue
  cue vet scrobble-schema.cue $cue
done

```
