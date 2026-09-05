from pathlib import Path

path = Path(r'D:\Drive C\Desktop\Kushal\Clipper\clinqclippers\Clinq_Frontend_Backend\backend\earnings\serializers.py')
text = path.read_text(encoding='utf-8')
old_line = "        fields = ['id', 'amount', 'transactionType', 'status', 'external_ref', 'createdAt']"
new_block = (
    "        fields = [\n"
    "            'id',\n"
    "            'amount',\n"
    "            'transactionType',\n"
    "            'paymentMethod',\n"
    "            'paymentDetails',\n"
    "            'status',\n"
    "            'external_ref',\n"
    "            'contentTitle',\n"
    "            'submissionId',\n"
    "            'createdAt',\n"
    "        ]"
)
if old_line not in text:
    raise SystemExit('old line not found')
text = text.replace(old_line, new_block, 1)
if 'def get_contentTitle' not in text:
    insert_after = new_block
    helper_block = (
        "\n    def get_contentTitle(self, obj):\n"
        "        return obj.content.title if obj.content else None\n\n"
        "    def get_submissionId(self, obj):\n"
        "        return obj.submission.id if obj.submission else None\n"
    )
    text = text.replace(new_block, new_block + helper_block, 1)
path.write_text(text, encoding='utf-8')
print('patched')
