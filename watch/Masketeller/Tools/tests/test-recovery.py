import importlib.util,json,pathlib,tempfile,unittest
spec=importlib.util.spec_from_file_location('recover',pathlib.Path(__file__).parents[1]/'recover-partials.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class RecoveryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.folder=self.root/'partial';self.folder.mkdir()
  (self.folder/'manifest.json').write_text(json.dumps(dict(startedAt='2026-09-07T14:37:39Z',algorithmVersion='test',startK=3.4)))
  (self.folder/'start-settings.json').write_text('{}')
  for i in range(3):
   c={k:[float(i+1)] if k=='t' else [0.] for k in mod.RAW};c['counterEvents']=[]
   (self.folder/f'raw-{i:06}.json').write_text(json.dumps(c))
 def tearDown(self):self.tmp.cleanup()
 def test_valid_and_exclusive(self):
  out=self.root/'out.json';r=mod.recover(self.folder,out);self.assertEqual(r['samples'],3)
  with self.assertRaises(ValueError):mod.recover(self.folder,out)
 def test_corrupt_strict_and_salvage(self):
  f=self.folder/'raw-000001.json';f.write_text('{broken')
  with self.assertRaises(ValueError):mod.recover(self.folder,self.root/'strict.json')
  self.assertFalse((self.root/'strict.json').exists())
  r=mod.recover(self.folder,self.root/'salvage.json',True);self.assertEqual(r['samples'],2);self.assertEqual(len(r['issues']),1);self.assertEqual(f.read_text(),'{broken')
 def test_missing_chunk(self):
  (self.folder/'raw-000001.json').unlink()
  with self.assertRaises(ValueError):mod.recover(self.folder,self.root/'out.json')
 def test_nonmonotonic(self):
  f=self.folder/'raw-000001.json';r=json.loads(f.read_text());r['t']=[1.];f.write_text(json.dumps(r))
  with self.assertRaises(ValueError):mod.recover(self.folder,self.root/'out.json')
 def test_unequal_channels(self):
  f=self.folder/'raw-000001.json';r=json.loads(f.read_text());r['gx']=[];f.write_text(json.dumps(r))
  with self.assertRaises(ValueError):mod.recover(self.folder,self.root/'out.json')
if __name__=='__main__':unittest.main()
