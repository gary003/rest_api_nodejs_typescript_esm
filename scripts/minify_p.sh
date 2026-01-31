DIR_NAME=$(basename "$PWD")
CURRENT_DATE=$(date +%Y%m%d_%H%M%S)

rm -f PROJECT_DUMP_* && echo "Previous dump file deleted"

OUTPUT_FILE="PROJECT_DUMP_${DIR_NAME}_${CURRENT_DATE}.txt"

echo "" > "$OUTPUT_FILE"

find . -type f \
! -name "PROJECT_DUMP_*" \
! -name "package-lock.json" \
! -path "*/node_modules/*" \
! -path "*/logs/*" \
! -path "*/coverage/*" \
! -path "*/db_volume/*" \
! -path "*/db_test_development/*" \
! -path "*/redis/*" \
! -path "*/grafana_data_volume/*" \
! -path "*/promtail/*" \
! -path "*/trace_data_volume/*" \
! -path "*/.git/*" \
! -path "*/github/*" | \
while read -r file; do
    echo "------- file: $file -------" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "Project dump file (${OUTPUT_FILE}) created in root directory"
