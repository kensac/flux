#!/usr/bin/env python3
import re
import sys

def parse_oui_file(input_file, output_file):
    oui_data = []

    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()

            match = re.match(r'^([0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2})\s+\(hex\)\s+(.+)$', line)
            if match:
                oui_hex = match.group(1).replace('-', ':')
                vendor = match.group(2).strip()
                vendor = vendor.replace('"', '\\"')
                oui_data.append((oui_hex, vendor))

    with open(output_file, 'w') as f:
        f.write('#include "oui.h"\n')
        f.write('#include <string.h>\n')
        f.write('#include <stdio.h>\n\n')

        f.write('typedef struct {\n')
        f.write('    uint8_t prefix[3];\n')
        f.write('    const char *vendor;\n')
        f.write('} oui_entry_t;\n\n')

        f.write(f'static const oui_entry_t oui_db[{len(oui_data)}] = {{\n')
        for oui_hex, vendor in oui_data:
            parts = oui_hex.split(':')
            f.write(f'    {{{{0x{parts[0]}, 0x{parts[1]}, 0x{parts[2]}}}, "{vendor}"}},\n')
        f.write('};\n\n')

        f.write('const char* oui_lookup(const uint8_t *mac) {\n')
        f.write(f'    for (size_t i = 0; i < {len(oui_data)}; i++) {{\n')
        f.write('        if (memcmp(mac, oui_db[i].prefix, 3) == 0) {\n')
        f.write('            return oui_db[i].vendor;\n')
        f.write('        }\n')
        f.write('    }\n')
        f.write('    return "Unknown";\n')
        f.write('}\n')

    print(f"Generated {len(oui_data)} OUI entries")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: generate_oui.py <input_oui.txt> <output_oui.c>")
        sys.exit(1)

    parse_oui_file(sys.argv[1], sys.argv[2])
