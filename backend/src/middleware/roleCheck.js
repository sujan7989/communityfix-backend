exports.isOfficial = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role !== 'official') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
