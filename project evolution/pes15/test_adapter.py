"""Integration tests for independent Portfolio Builder to PES-15 bridge.

Run with: PYTHONPATH=<pes15-engine-root>:<bridge-dir> python -m unittest -v test_adapter
"""
from __future__ import annotations
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
from adapter import inspect_snapshot, BridgeError

ENGINE_ROOT = Path(__file__).resolve().parent

class BridgeTests(unittest.TestCase):
    def setUp(self):
        from pes15.core import read_json
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.original = Path(__file__).resolve().parents[1] / 'Project-Evolution-V1-PES-14.json'
        # Packaged deployment provides a user-selected sample via TEST_PES14_SAMPLE.
        if not self.original.is_file():
            import os
            env = os.environ.get('TEST_PES14_SAMPLE')
            if not env or not Path(env).is_file():
                self.skipTest('set TEST_PES14_SAMPLE to PES-14 fixture JSON to run integration tests')
            self.original = Path(env)
        self.src = self.root / 'Project-Evolution-V1-PES-14.json'
        self.src.write_bytes(self.original.read_bytes())

    def test_isolated_full_audit_and_no_source_edits(self):
        from pes15.core import read_json
        before = self.src.read_bytes()
        out = self.root / 'isolated'
        report = inspect_snapshot(self.src, out)
        self.assertTrue(report['source_unchanged'])
        self.assertTrue(report['store_verified'])
        self.assertEqual(before, self.src.read_bytes())
        self.assertEqual(read_json(out / 'migrated-pes15.json')['records'], read_json(self.src)['records'])
        self.assertTrue((out / 'pes15-backup.sqlite').is_file())
        self.assertTrue((out / 'continuation-context.json').is_file())
        self.assertTrue((out / 'assessment-report.json').is_file())

    def test_refuses_existing_destination(self):
        out = self.root / 'already'
        out.mkdir()
        (out / 'keep.txt').write_text('sentinel', encoding='utf-8')
        with self.assertRaises(BridgeError):
            inspect_snapshot(self.src, out)
        self.assertEqual((out / 'keep.txt').read_text(), 'sentinel')

    def test_refuses_non_pes14_source(self):
        self.src.write_text('{"_pes":{"standard":"PES-15"}}', encoding='utf-8')
        with self.assertRaises(BridgeError):
            inspect_snapshot(self.src, self.root / 'no-output')
        self.assertFalse((self.root / 'no-output').exists())

    def test_fails_closed_on_invalid_relationship(self):
        doc = json.loads(self.src.read_text(encoding='utf-8'))
        doc['records']['tasks'][0]['related_record_ids'] = ['missing-foreign-record']
        self.src.write_text(json.dumps(doc), encoding='utf-8')
        with self.assertRaises(ValueError):
            inspect_snapshot(self.src, self.root / 'invalid')
        self.assertFalse((self.root / 'invalid').exists())

    def test_refuses_source_directory_as_output(self):
        with self.assertRaises(BridgeError):
            inspect_snapshot(self.src, self.src.parent)

    def test_invalid_sha_rejected_before_files(self):
        with self.assertRaises(BridgeError):
            inspect_snapshot(self.src, self.root / 'bad-commit', source_commit='hello')
        self.assertFalse((self.root / 'bad-commit').exists())

    def test_no_clobber_on_second_run(self):
        out = self.root / 'out'
        inspect_snapshot(self.src, out)
        with self.assertRaises(BridgeError):
            inspect_snapshot(self.src, out)

if __name__ == '__main__':
    unittest.main()
