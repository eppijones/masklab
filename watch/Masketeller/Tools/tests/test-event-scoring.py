import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('score',pathlib.Path(__file__).parents[1]/'score-events.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ScoreTests(unittest.TestCase):
 def test_one_to_one(self):
  l=dict(scorableIntervals=[dict(start=0,end=10,partition='holdout')],completions=[dict(time=2,confidence='clear'),dict(time=5,confidence='clear')]);s=m.score(l,[1.9,2.1,5.4]);self.assertEqual((s['truePositive'],s['falsePositive'],s['duplicates']),(2,1,1));self.assertEqual(s['recall'],1)
 def test_no_labels_no_accuracy(self):self.assertIsNone(m.score({},[1,2])['f1'])
 def test_partition_and_unknown(self):
  l=dict(scorableIntervals=[dict(start=0,end=10,partition='holdout')],uncertainIntervals=[dict(start=4,end=6)],completions=[dict(time=2,confidence='clear'),dict(time=5,confidence='clear')]);s=m.score(l,[2,5,20]);self.assertEqual(s['truePositive'],1);self.assertEqual(s['falsePositive'],0)
if __name__=='__main__':unittest.main()
