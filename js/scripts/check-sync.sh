 #!/usr/bin/env bash

# Define hosts array
hosts=("darwin" "dirac" "d1-px1")

echo "## Checking versions"
for host in "${hosts[@]}"; do
    version=$(curl -s "http://${host}.imetrical.com:8000/api/version")
    echo "${host} ${version}"
done

echo -e "\n## Checking status"
for host in "${hosts[@]}"; do
    status=$(curl -s "http://${host}.imetrical.com:8000/api/status")
    echo "${host} ${status}"
done

echo -e "\n## Checking digests"
for host in "${hosts[@]}"; do
    digest=$(curl -s "http://${host}.imetrical.com:8000/api/digests" | shasum -a 256)
    echo "${host} ${digest}"
done