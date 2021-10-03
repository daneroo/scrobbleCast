# Scrobble Cast CUE validation

- Take a sample of our `jsonl` file and validate with cue

Take a sample:

```bash
mkdir sample
scp ../../js/data/snapshots/monthly/daniel/monthly-daniel-2014-11-01T00\:00\:00Z.jsonl sample/scrobble-sample.jsonl
```

Convert to cue:

```bash
cue import -f --list ./sample/scrobble-sample.jsonl
```

```bash
cue vet -d "#item" scrobble-schema.cue ./sample/scrobble-sample.jsonl

# need a different schema when in list format?
# cue vet scrobble-schema.cue ./sample/scrobble-sample.cue
```

## Actual Data

```bash
mkdir data
# get a copy of the data
scp -rp ../../js/data/snapshots data/

for yyyy in 2014 2015 2016 2017 2018 2019 2020 2021; do 
  echo $yyyy; 
  mkdir -p data/snapshots/yearly/
  cat data/snapshots/monthly/daniel/monthly-daniel-$yyyy-*.jsonl >data/snapshots/yearly/$yyyy.jsonl
done

cue vet -d "#item" scrobble-schema.cue ./data/snapshots/yearly/20*.jsonl

# cue import -f --list ./data/snapshots/yearly/

```
